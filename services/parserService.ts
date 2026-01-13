import { QuoteItem } from '../types.ts';

// --- Helper Functions ---

/**
 * Extracts availability information from the text line.
 */
function extractAvailability(text: string): { availability: string, remainingText: string } {
  const availPatterns = [
    /All\s+\d+\s+by\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{2,4})?/i,
    /All\s+\d+\s+by\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i,
    /\d+\s+in\s+stock/i,
    /\bIn\s+Stock\b/i,
    /Contact\s+Dealer/i,
    /Backorder/i,
    /Lead\s+Time[:\s]+\d+\s+Days/i
  ];

  let availability = "";
  let remainingText = text;

  for (const pat of availPatterns) {
    const m = text.match(pat);
    if (m) {
      availability = m[0];
      remainingText = remainingText.replace(pat, " ");
      break;
    }
  }

  return { availability, remainingText };
}

/**
 * Clean string to remove generic labels, third-party vendor info, and ensure only item details remain.
 */
function cleanDescription(text: string): string {
  if (!text) return "";

  let cleaned = String(text)
    // Remove specific URL artifacts from CAT PDFs
    .replace(/\/\/parts\.cat\.com\/[^\s]*/gi, '')
    // Remove Third Party Vendor Names & Specific Addresses (Ring Power, etc)
    .replace(/Ring Power|RING POWER CORPORATION|Tampa|Riverview|Fern Hill|025069|ADAM qadah|americanyellowiron\.com/gi, "")
    .replace(/10421 Fern Hill Dr\.|813-671-3700|33578|United States|Florida|Cat Vantage Rewards|adam@/gi, "")
    // Remove Page Sections & Summary Headers
    .replace(/Order Information|Order Summary|View Order|Ship To|Bill To|Payment Method|Tracking Number|Add to Cart|Pickup Location|Pickup Method|SUMMARY OF CHARGES|Items In Your Order|Page \d+ of \d+/gi, "")
    // Remove Table Headers
    .replace(/\b(Unit Price|Extended Price|Total Price|Product Description|Line Item|Availability|Notes|Quantity|Part Number|Description)\b/gi, "")
    // Remove Summary Labels aggressively
    .replace(/ORDER SUBTOTAL|Shipping\/Miscellaneous|Total Tax|ORDER TOTAL|Contact Dealer|SUBTOTAL|TAX/gi, "")
    .replace(/\(USD\)/g, "")
    // Remove specific part-row boilerplate
    .replace(/Core Charge Included|Remanufactured part/gi, "")
    // Remove trailing/orphaned prices and units
    .replace(/[\$]?[0-9,]+\.[0-9]{2}\s+(?:ea\.?|USD)/gi, "")
    .replace(/[\$]?[0-9,]+\.[0-9]{2}/g, "")
    // Clean up characters
    .replace(/[:|]/g, " ")
    .trim();

  // Remove leading row indexes or common PDF artifacts (e.g. "10 ", "001 ", "1) ")
  cleaned = cleaned.replace(/^(?:\d+[\s)\.]*)+/, "");
  // Remove leading symbols
  cleaned = cleaned.replace(/^[\s\-_>]+/, "");

  return cleaned.replace(/\s{2,}/g, " ").trim();
}

function extractWeight(text: string): number {
  const m = String(text).match(/(\d+(?:\.\d+)?)\s*(lb|lbs|1bs|kg|kgs|kilogram|k\.g\.)\b/i);
  if (!m) return 0;

  const val = parseFloat(m[1]);
  const unit = (m[2] || "").toLowerCase();

  if (unit.includes("kg") || unit.includes("kilogram") || unit.includes("k.g")) {
    return val * 2.20462;
  }

  return val;
}

function isDateString(str: string): boolean {
  return /^\d{1,2}[-\/]\d{2,4}$/.test(str) || /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/.test(str);
}

export const parseTextData = (text: string): QuoteItem[] => {
  const lines = text.split('\n');
  const items: QuoteItem[] = [];
  
  const lineRegex = /(?:^|\s)(?:(\d+)[\)\.]?\s+)?(\d+)\s+([A-Z0-9\.\/-]{3,20})(?::|\s+|$)(.+)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(lineRegex);
    if (m) {
      if (isDateString(m[3])) continue;

      const qty = parseInt(m[2]);
      const restOfLine = m[4] || "";

      let unitPrice = 0;
      const unitPriceMatch = restOfLine.match(/\$([0-9,]+\.[0-9]{2})\s*ea/i);
      const allPriceMatches = Array.from(restOfLine.matchAll(/\$([0-9,]+\.[0-9]{2})/g));

      if (unitPriceMatch) {
          unitPrice = parseFloat(unitPriceMatch[1].replace(/,/g, ''));
      } else if (allPriceMatches.length > 0 && qty > 0) {
          const lineTotal = parseFloat(allPriceMatches[0][1].replace(/,/g, ''));
          unitPrice = lineTotal / qty;
      }

      items.push({
        lineNo: m[1],
        qty: qty,
        partNo: m[3],
        desc: cleanDescription(restOfLine.replace(/\$[0-9,.]+/g, '').replace(/ea\./ig, '')),
        weight: extractWeight(trimmed),
        unitPrice: unitPrice,
        availability: extractAvailability(trimmed).availability,
        originalImages: []
      });
    }
  }
  return items;
};

export const parseExcelFile = async (file: File): Promise<QuoteItem[]> => {
  const data = await file.arrayBuffer();
  const workbook = window.XLSX.read(data, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = window.XLSX.utils.sheet_to_json(worksheet);
  return jsonData.map((row: any) => ({
    qty: Number(row.qty || row.Quantity || 1),
    partNo: String(row.partNo || row.Part || row.Item || ""),
    desc: cleanDescription(String(row.desc || row.Description || "Part Description")),
    weight: Number(row.weight || row.Weight || 0),
    unitPrice: Number(row.unitPrice || row.Price || 0),
    availability: String(row.availability || ""),
    originalImages: []
  })).filter(item => item.partNo && !isDateString(item.partNo));
};

export const parsePdfFile = async (file: File): Promise<QuoteItem[]> => {
  if (!window.pdfjsLib) {
    throw new Error("PDF Engine not loaded. Please refresh the page.");
  }

  const arrayBuffer = await file.arrayBuffer();
  let pdf;
  try {
    pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (e) {
    console.error("PDF Load Error", e);
    throw new Error("Could not read PDF structure.");
  }

  let items: QuoteItem[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const itemYCoordinates: { item: QuoteItem, y: number }[] = [];
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const linesMap = new Map<number, any[]>();
    
    textContent.items.forEach((item: any) => {
      if (!item || !item.transform) return;
      const y = Math.round(item.transform[5]);
      let matchY: number | undefined;
      for (const key of linesMap.keys()) {
        if (Math.abs(key - y) <= 4) { 
          matchY = key;
          break;
        }
      }
      if (matchY === undefined) {
        matchY = y;
        linesMap.set(matchY, []);
      }
      linesMap.get(matchY)!.push(item);
    });

    const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
    const textLines = sortedY.map(y => {
      const itemsOnLine = linesMap.get(y)!.sort((a, b) => a.transform[4] - b.transform[4]);
      return {
        y,
        text: itemsOnLine.map(it => it.str).join(' ').trim()
      };
    }).filter(l => l.text.length > 0);

    const itemStartRegex = /^\s*(\d+)[\)\.]\s+(\d+)\s+([A-Z0-9\-\.:\/]+)(.*)$/i;
    let currentItem: QuoteItem | null = null;
    let currentY = 0;

    for (const lineObj of textLines) {
      const text = lineObj.text;
      if (text.match(/SUMMARY OF CHARGES|ORDER TOTAL|SUBTOTAL|TAX|PAGE|INVOICE|QUOTATION|RING POWER|Payment Information/i)) {
        if (currentItem) { items.push(currentItem); itemYCoordinates.push({ item: currentItem, y: currentY }); currentItem = null; }
        continue;
      }

      const startMatch = text.match(itemStartRegex);
      
      if (startMatch && !isDateString(startMatch[3])) {
        if (currentItem) { items.push(currentItem); itemYCoordinates.push({ item: currentItem, y: currentY }); }

        const rawPart = startMatch[3].replace(/:$/, '');
        const initialDesc = cleanDescription(startMatch[4]);
        const qty = parseInt(startMatch[2]);
        
        let unitPrice = 0;
        const unitPriceMatch = text.match(/\$([0-9,]+\.[0-9]{2})\s*ea/i);
        const allPriceMatches = Array.from(text.matchAll(/\$([0-9,]+\.[0-9]{2})/g));

        if (unitPriceMatch) {
            unitPrice = parseFloat(unitPriceMatch[1].replace(/,/g, ''));
        } else if (allPriceMatches.length > 0 && qty > 0) {
            const lineTotal = parseFloat(allPriceMatches[0][1].replace(/,/g, ''));
            unitPrice = lineTotal / qty;
        }
        
        currentItem = {
           lineNo: startMatch[1],
           qty: qty,
           partNo: rawPart,
           desc: initialDesc || "CAT COMPONENT",
           weight: extractWeight(text),
           unitPrice: unitPrice,
           availability: extractAvailability(text).availability,
           notes: '',
           originalImages: []
        };
        currentY = lineObj.y;
      } 
      else if (currentItem) {
        if (Math.abs(currentY - lineObj.y) > 300) {
             items.push(currentItem); 
             itemYCoordinates.push({ item: currentItem, y: currentY }); 
             currentItem = null;
             continue;
        }

        let tempItem = { ...currentItem };
        if (tempItem.unitPrice === 0) {
            const qty = tempItem.qty;
            const unitPriceMatch = text.match(/\$([0-9,]+\.[0-9]{2})\s*ea/i);
            const allPriceMatches = Array.from(text.matchAll(/\$([0-9,]+\.[0-9]{2})/g));

            if (unitPriceMatch) {
                tempItem.unitPrice = parseFloat(unitPriceMatch[1].replace(/,/g, ''));
            } else if (allPriceMatches.length > 0 && qty > 0) {
                const lineTotal = parseFloat(allPriceMatches[0][1].replace(/,/g, ''));
                tempItem.unitPrice = lineTotal / qty;
            }
        }

        if (!tempItem.availability) {
            const av = extractAvailability(text);
            if (av.availability) tempItem.availability = av.availability;
        }

        if (tempItem.weight === 0) {
            const w = extractWeight(text);
            if (w > 0) tempItem.weight = w;
        }

        const notePrefixMatch = text.match(/Line item note:\s*(.*)/i);
        const replacesMatch = text.match(/(Replaces Part # .*)/i);
        const nonReturnable = text.match(/(Non-returnable part)/i);

        if (notePrefixMatch) {
            tempItem.notes = (tempItem.notes ? tempItem.notes + ' ' : '') + notePrefixMatch[1].trim();
        } else if (replacesMatch) {
            tempItem.notes = (tempItem.notes ? tempItem.notes + ' ' : '') + replacesMatch[1].trim();
        } else if (nonReturnable) {
             tempItem.desc += '\n' + nonReturnable[1];
        } else {
             let clean = text;
             clean = clean.replace(/\$[0-9,]+\.[0-9]{2}(?:\s*ea\.)?/gi, '');
             clean = clean.replace(/All \d+ by [A-Za-z0-9 ]+/i, '').replace(/\d+ in stock/i, '').replace(/Contact Dealer/i, '');
             clean = cleanDescription(clean);
             if (clean.length > 2 && !clean.match(/^\d+\)$/)) { 
                 tempItem.desc += ' ' + clean;
             }
        }
        currentItem = tempItem;
      }
    }
    if (currentItem) { items.push(currentItem); itemYCoordinates.push({ item: currentItem, y: currentY }); }

    // --- Image Extraction Logic ---
    const opList = await page.getOperatorList();
    const images = [];
    for (let j = 0; j < opList.fnArray.length; j++) {
      if (opList.fnArray[j] === window.pdfjsLib.OPS.paintImageXObject) {
        const imgKey = opList.argsArray[j][0];
        const currentTransform = opList.argsArray[j-1].slice(); // Heuristic: transform is often before paint
        if(currentTransform && currentTransform.length === 6) {
             images.push({ key: imgKey, y: currentTransform[5], x: currentTransform[4] });
        }
      }
    }

    for (const image of images) {
      try {
        const imgData = await page.objs.get(image.key);
        if(!imgData || !imgData.data) continue;

        const canvas = document.createElement("canvas");
        canvas.width = imgData.width;
        canvas.height = imgData.height;
        const ctx = canvas.getContext("2d");
        if(!ctx) continue;

        const pixels = ctx.createImageData(imgData.width, imgData.height);
        if (imgData.kind === window.pdfjsLib.ImageKind.GRAYSCALE_1BPP) {
            let k = 0;
            for (let i = 0; i < imgData.data.length; i++) {
                const byte = imgData.data[i];
                for (let bit = 7; bit >= 0; bit--) {
                    const monotoken = (byte >> bit) & 1;
                    const color = monotoken === 0 ? 255 : 0;
                    pixels.data[k++] = color;
                    pixels.data[k++] = color;
                    pixels.data[k++] = color;
                    pixels.data[k++] = 255;
                }
            }
        } else if(imgData.kind === window.pdfjsLib.ImageKind.RGB_24BPP) {
            let k = 0;
            for (let i = 0; i < imgData.data.length; i += 3) {
                pixels.data[k++] = imgData.data[i];
                pixels.data[k++] = imgData.data[i+1];
                pixels.data[k++] = imgData.data[i+2];
                pixels.data[k++] = 255;
            }
        } else if(imgData.kind === window.pdfjsLib.ImageKind.RGBA_32BPP) {
            let k = 0;
            for (let i = 0; i < imgData.data.length; i += 4) {
                pixels.data[k++] = imgData.data[i];
                pixels.data[k++] = imgData.data[i+1];
                pixels.data[k++] = imgData.data[i+2];
                pixels.data[k++] = imgData.data[i+3];
            }
        } else {
            pixels.data.set(new Uint8ClampedArray(imgData.data));
        }
        ctx.putImageData(pixels, 0, 0);

        const dataUrl = canvas.toDataURL();

        // Associate image with the closest item by Y-coordinate
        let closestItem = null;
        let minDiff = Infinity;
        for (const itemCoord of itemYCoordinates) {
            const diff = Math.abs(itemCoord.y - image.y);
            if (diff < minDiff && diff < 50) { // 50px tolerance
                minDiff = diff;
                closestItem = itemCoord.item;
            }
        }
        if (closestItem && closestItem.originalImages) {
            closestItem.originalImages.push(dataUrl);
        }
      } catch (e) {
        console.warn(`Could not resolve image object '${image.key}':`, e);
        // Continue to next image if one fails
      }
    }
  }

  return items;
};