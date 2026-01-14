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
    /Lead\s+Time[:\s]+\d+\s+Days/i,
    /\d+\s+Weeks/i
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

  return { availability: availability.trim(), remainingText };
}

/**
 * Clean string to remove generic labels, third-party vendor info, and ensure only item details remain.
 */
function cleanDescription(text: string): string {
  if (!text) return "";

  let cleaned = String(text)
    .replace(/\/\/parts\.cat\.com\/[^\s]*/gi, '')
    .replace(/Ring Power|RING POWER CORPORATION|Industrial Parts Depot, LLC|COSTEX TRACTOR PARTS/gi, "")
    .replace(/Tampa|Riverview|Fern Hill|025069|ADAM qadah|americanyellowiron\.com|Carson CA 90746|Miami, FL 33166/gi, "")
    .replace(/10421 Fern Hill Dr\.|813-671-3700|33578|United States|Florida|Cat Vantage Rewards|adam@/gi, "")
    .replace(/Order Information|Order Summary|View Order|Ship To|Bill To|Payment Method|Tracking Number|Add to Cart|Pickup Location|Pickup Method|SUMMARY OF CHARGES|Items In Your Order|Page \d+ of \d+/gi, "")
    .replace(/\b(Unit Price|Extended Price|Total Price|Product Description|Line Item|Availability|Notes|Quantity|Part Number|Description|Comments|Wt\.|Unit|Extended)\b/gi, "")
    .replace(/ORDER SUBTOTAL|Shipping\/Miscellaneous|Total Tax|ORDER TOTAL|Contact Dealer|SUBTOTAL|TAX|Net Price|Line Total/gi, "")
    .replace(/\(USD\)|USD/g, "")
    .replace(/Core Charge Included|Remanufactured part|Non-returnable part/gi, "")
    .replace(/[\$]?[0-9,]+\.[0-9]{2}\s*(?:ea\.?)/gi, "")
    .replace(/[\$]?[0-9,]+\.[0-9]{2}/g, "")
    .replace(/[:|]/g, " ")
    .trim();

  cleaned = cleaned.replace(/^(?:\d+[\s)\.]*)+/, "");
  cleaned = cleaned.replace(/^[\s\-_>]+/, "");

  return cleaned.replace(/\s{2,}/g, " ").trim();
}

function extractWeight(text: string): number {
  const m = String(text).match(/(\d+(?:\.\d+)?)\s*(lb|lbs|1bs|LBS|kg|kgs|kilogram|k\.g\.)\b/i);
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

// --- Vendor-Specific Parsers ---

/** Parser for Ring Power format */
function parseRingPowerPage(textLines: {y: number, text: string}[]): QuoteItem[] {
  const items: QuoteItem[] = [];
  const itemStartRegex = /^\s*(\d+)[\)\.]\s+(\d+)\s+([A-Z0-9\-\.:\/]+)(.*)$/i;
  let currentItem: QuoteItem | null = null;
  let currentY = 0;

  for (const lineObj of textLines) {
    const text = lineObj.text;
    if (text.match(/SUMMARY OF CHARGES|ORDER TOTAL|SUBTOTAL|TAX|PAGE|INVOICE|QUOTATION/i)) {
      if (currentItem) items.push(currentItem);
      currentItem = null;
      continue;
    }

    const startMatch = text.match(itemStartRegex);
    if (startMatch && !isDateString(startMatch[3])) {
      if (currentItem) items.push(currentItem);

      const qty = parseInt(startMatch[2]);
      const rawPart = startMatch[3].replace(/:$/, '');
      const initialDesc = cleanDescription(startMatch[4]);
      
      let unitPrice = 0;
      const unitPriceMatch = text.match(/\$([0-9,]+\.[0-9]{2})\s*ea/i);
      const allPriceMatches = Array.from(text.matchAll(/\$([0-9,]+\.[0-9]{2})/g));

      if (unitPriceMatch) {
          unitPrice = parseFloat(unitPriceMatch[1].replace(/,/g, ''));
      } else if (allPriceMatches.length > 0 && qty > 0) {
          const lineTotal = parseFloat(allPriceMatches[allPriceMatches.length - 1][1].replace(/,/g, ''));
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
    } else if (currentItem) {
      if (Math.abs(currentY - lineObj.y) > 300) {
           items.push(currentItem); 
           currentItem = null;
           continue;
      }
      let clean = text.replace(/\$[0-9,]+\.[0-9]{2}(?:\s*ea\.)?/gi, '');
      if (currentItem.weight === 0) currentItem.weight = extractWeight(text);
      if (!currentItem.availability) currentItem.availability = extractAvailability(text).availability;

      const notePrefixMatch = text.match(/Line item note:\s*(.*)/i);
      if (notePrefixMatch) {
          currentItem.notes = (currentItem.notes ? currentItem.notes + ' ' : '') + notePrefixMatch[1].trim();
      } else if (clean.length > 2) {
           currentItem.desc += ' ' + cleanDescription(clean);
      }
    }
  }
  if (currentItem) items.push(currentItem);
  return items;
}

/** Parser for Industrial Parts Depot format */
function parseIpdPage(textLines: {y: number, text: string}[]): QuoteItem[] {
  const items: QuoteItem[] = [];
  const itemStartRegex = /^(\d+)\s+([A-Z0-9\-/C]+)\s+/;
  let currentItem: QuoteItem | null = null;

  for (const { text } of textLines) {
    const isItemLine = itemStartRegex.test(text) && text.includes('LBS') && /([\d,.]*\.\d{2})\s*$/.test(text);

    if (isItemLine) {
        if (currentItem) items.push(currentItem);
        const match = text.match(itemStartRegex)!;
        const qty = parseInt(match[1]);
        const partNo = match[2];
        let rest = text.substring(match[0].length);

        const prices = rest.match(/([\d,.]*\.\d{2})\s+([\d,.]*\.\d{2})$/);
        const unitPrice = prices ? parseFloat(prices[1].replace(/,/g, '')) : 0;
        if (prices) rest = rest.replace(prices[0], '');

        const weight = extractWeight(rest);
        rest = rest.replace(/([\d\.]+)LBS/, '');
        
        rest = rest.replace(/\w{2}\s+\d{1,2}\/\d{1,2}\/\d{4}/, '').trim();

        currentItem = {
            qty,
            partNo,
            desc: cleanDescription(rest),
            weight,
            unitPrice,
            originalImages: [],
        };
    } else if (currentItem && !text.match(/Subtotal|Total|Tax|Freight|Discount/i)) {
        currentItem.desc += '\n' + text.trim();
    }
  }
  if (currentItem) items.push(currentItem);
  return items;
}

/** Parser for Costex format */
function parseCostexPage(textLines: {y: number, text: string}[]): QuoteItem[] {
    const items: QuoteItem[] = [];
    const itemStartRegex = /^\d{4}\s+[A-Z0-9]+\s+/;

    for (const { text } of textLines) {
        if (!itemStartRegex.test(text)) continue;

        const parts = text.split(/\s+/).filter(p => p);
        if (parts.length < 5) continue;

        const lineNo = parts[0];
        const partNo = parts[1];
        
        const lineTotalStr = parts[parts.length - 1];
        const netPriceStr = parts[parts.length - 2];
        const qtyStr = parts[parts.length - 4];

        const netPrice = parseFloat(netPriceStr.replace(/,/g, ''));
        const lineTotal = parseFloat(lineTotalStr.replace(/,/g, ''));
        if (isNaN(netPrice) || isNaN(lineTotal) || (netPrice === 0 && lineTotal === 0)) continue;

        const qty = parseInt(qtyStr) || 1;
        
        let weight = 0;
        let descParts: string[] = [];
        let weightIndex = -1;
        // Find weight: it's a float after the description
        for (let i = 2; i < parts.length - 5; i++) {
            if (!isNaN(parseFloat(parts[i])) && parts[i].includes('.')) {
                weight = parseFloat(parts[i]);
                weightIndex = i;
                break;
            }
        }

        if (weightIndex !== -1) {
            descParts = parts.slice(2, weightIndex);
        } else {
            // Heuristic: description is up to the parts that are clearly not desc
            let stopIndex = parts.length - 5;
            descParts = parts.slice(2, stopIndex);
        }

        const desc = descParts.join(' ');
        const availability = extractAvailability(text).availability;
        
        items.push({
            lineNo,
            qty,
            partNo,
            desc: cleanDescription(desc),
            weight,
            unitPrice: netPrice,
            availability,
            originalImages: [],
        });
    }
    return items;
}


// --- Main Service Functions ---

export const parseTextData = (text: string): QuoteItem[] => {
  const lines = text.split('\n').map(line => ({ y: 0, text: line }));
  
  if (text.includes("RING POWER")) {
      return parseRingPowerPage(lines);
  }
  if (text.includes("Industrial Parts Depot")) {
      return parseIpdPage(lines);
  }
  if (text.includes("COSTEX TRACTOR")) {
      return parseCostexPage(lines);
  }
  // Fallback to the most common format
  return parseRingPowerPage(lines);
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
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map((item: any) => item.str).join(' ');
  }

  let vendorParser: (textLines: {y: number, text: string}[]) => QuoteItem[];
  if (fullText.includes("Industrial Parts Depot")) {
    vendorParser = parseIpdPage;
  } else if (fullText.includes("COSTEX TRACTOR")) {
    vendorParser = parseCostexPage;
  } else {
    vendorParser = parseRingPowerPage; // Default/RingPower
  }

  let allItems: QuoteItem[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    const linesMap = new Map<number, any[]>();
    textContent.items.forEach((item: any) => {
      const y = Math.round(item.transform[5]);
      let matchY: number | undefined;
      for (const key of linesMap.keys()) {
        if (Math.abs(key - y) <= 4) { matchY = key; break; }
      }
      if (matchY === undefined) {
        matchY = y;
        linesMap.set(matchY, []);
      }
      linesMap.get(matchY)!.push(item);
    });

    const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
    const textLines = sortedY.map(y => ({
      y,
      text: linesMap.get(y)!.sort((a, b) => a.transform[4] - b.transform[4]).map(it => it.str).join(' ').trim()
    })).filter(l => l.text.length > 0);

    const pageItems = vendorParser(textLines);
    
    // --- Image Extraction Logic for this page ---
    const opList = await page.getOperatorList();
    const images: { key: string, y: number, x: number }[] = [];
    for (let j = 0; j < opList.fnArray.length; j++) {
      if (opList.fnArray[j] === window.pdfjsLib.OPS.paintImageXObject) {
        const key = opList.argsArray[j][0];
        const transform = opList.argsArray[j-1];
        if (transform && transform.length === 6) {
          images.push({ key, y: transform[5], x: transform[4] });
        }
      }
    }

    const itemYCoordinates = textLines.map(line => {
      const item = pageItems.find(p => line.text.includes(p.partNo));
      return item ? { item, y: line.y } : null;
    }).filter(Boolean) as { item: QuoteItem, y: number }[];

    for (const image of images) {
        const canvas = document.createElement("canvas");
        try {
            const imgData = await page.objs.get(image.key);
            if (!imgData || !imgData.data) continue;
            
            canvas.width = imgData.width;
            canvas.height = imgData.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) continue;
            
            const imageData = ctx.createImageData(imgData.width, imgData.height);
            if (imgData.kind === window.pdfjsLib.ImageKind.RGB_24BPP) {
              let j = 0;
              for (let k = 0; k < imgData.data.length; k += 3) {
                  imageData.data[j++] = imgData.data[k];
                  imageData.data[j++] = imgData.data[k + 1];
                  imageData.data[j++] = imgData.data[k + 2];
                  imageData.data[j++] = 255;
              }
            } else {
              imageData.data.set(imgData.data);
            }
            ctx.putImageData(imageData, 0, 0);

            const dataUrl = canvas.toDataURL();
            let closestItem = null;
            let minDiff = Infinity;
            for (const { item, y } of itemYCoordinates) {
                const diff = Math.abs(y - image.y);
                if (diff < minDiff && diff < 50) {
                    minDiff = diff;
                    closestItem = item;
                }
            }
            if (closestItem && closestItem.originalImages) {
                closestItem.originalImages.push(dataUrl);
            }
        } catch(e) { console.warn(`Could not process image ${image.key}:`, e); }
    }
    allItems.push(...pageItems);
  }

  return allItems;
};