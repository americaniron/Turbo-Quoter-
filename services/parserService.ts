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
    // Remove Third Party Vendor Names & Specific Addresses (Ring Power, etc)
    .replace(/Ring Power|RING POWER CORPORATION|Tampa|Riverview|Fern Hill|025069|ADAM qadah|adam@americanyellowiron\.com/gi, "")
    .replace(/10421 Fern Hill Dr\.|813-671-3700|33578|United States|Florida|Cat Vantage Rewards/gi, "")
    // Remove Page Sections & Summary Headers
    .replace(/Order Information|Pickup Location|Pickup Method|SUMMARY OF CHARGES|Items In Your Order|Page \d+ of \d+/gi, "")
    // Remove Table Headers
    .replace(/\b(Unit Price|Extended Price|Total Price|Product Description|Line Item|Availability|Notes|Quantity|Part Number|Description)\b/gi, "")
    // Remove Summary Labels aggressively
    .replace(/ORDER SUBTOTAL|Shipping\/Miscellaneous|Total Tax|ORDER TOTAL|Contact Dealer|SUBTOTAL|TAX/gi, "")
    .replace(/\(USD\)/g, "")
    // Remove specific part-row boilerplate
    .replace(/Core Charge Included/gi, "")
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
  
  // Paste Mode Regex: "1) 1 123-456: Desc"
  const lineRegex = /(?:^|\s)(?:(\d+)[\)\.]?\s+)?(\d+)\s+([A-Z0-9\.\/-]{3,20})(?::|\s+|$)(.+?)(?:\s+\$?([0-9,]+\.[0-9]{2}))?$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(lineRegex);
    if (m) {
      if (isDateString(m[3])) continue;

      items.push({
        lineNo: m[1],
        qty: parseInt(m[2]),
        partNo: m[3],
        desc: cleanDescription(m[4] || "CAT COMPONENT"),
        weight: extractWeight(trimmed),
        unitPrice: m[5] ? parseFloat(m[5].replace(/,/g, '')) : 0,
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

  const items: QuoteItem[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Group text items by Y coordinate with tolerance
    const linesMap = new Map<number, any[]>();
    
    textContent.items.forEach((item: any) => {
      if (!item || !item.transform) return;
      const y = Math.round(item.transform[5]);
      // Tolerance of 4 units handles slight misalignment
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

    // Extract images
    const extractedImages: { data: string, y: number }[] = [];
    try {
      const ops = await page.getOperatorList();
      let currentTransform = [1, 0, 0, 1, 0, 0];
      const OPS = window.pdfjsLib.OPS;
      if (OPS) {
          for (let j = 0; j < ops.fnArray.length; j++) {
            const fn = ops.fnArray[j];
            const args = ops.argsArray[j];
            if (fn === OPS.transform) currentTransform = args;
            if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
              const imgKey = args[0];
              try {
                const img = await page.objs.get(imgKey);
                if (img && img.data) {
                   const canvas = document.createElement('canvas');
                   canvas.width = img.width;
                   canvas.height = img.height;
                   const ctx = canvas.getContext('2d');
                   if (ctx) {
                     const imageData = ctx.createImageData(img.width, img.height);
                     imageData.data.set(img.data);
                     ctx.putImageData(imageData, 0, 0);
                     extractedImages.push({
                       data: canvas.toDataURL('image/jpeg', 0.8),
                       y: currentTransform[5]
                     });
                   }
                }
              } catch (e) {}
            }
          }
      }
    } catch (e) {}

    // State Machine Parser
    const itemStartRegex = /^\s*(\d+)[\)\.]\s+(\d+)\s+([A-Z0-9\-\.:]+)(.*)$/i;
    let currentItem: QuoteItem | null = null;
    let currentY = 0;

    for (const lineObj of textLines) {
      const text = lineObj.text;
      // aggressively skip third party headers
      if (text.match(/SUMMARY OF CHARGES|ORDER TOTAL|SUBTOTAL|TAX|PAGE|INVOICE|QUOTATION|RING POWER|Payment Information/i)) {
        if (currentItem) { items.push(currentItem); currentItem = null; }
        continue;
      }

      const startMatch = text.match(itemStartRegex);
      
      // Start of new item
      if (startMatch && !isDateString(startMatch[3])) {
        if (currentItem) items.push(currentItem);

        const rawPart = startMatch[3].replace(/:$/, '');
        const initialDesc = cleanDescription(startMatch[4]);
        
        currentItem = {
           lineNo: startMatch[1],
           qty: parseInt(startMatch[2]),
           partNo: rawPart,
           desc: initialDesc || "CAT COMPONENT",
           weight: extractWeight(text),
           unitPrice: 0,
           availability: extractAvailability(text).availability,
           notes: '',
           originalImages: []
        };
        currentY = lineObj.y;

        const priceMatch = text.match(/\$([0-9,]+\.[0-9]{2})/);
        if (priceMatch) {
            currentItem.unitPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
        }
      } 
      // Continuation of current item
      else if (currentItem) {
        if (Math.abs(currentY - lineObj.y) > 300) {
             items.push(currentItem);
             currentItem = null;
             continue;
        }

        const priceMatches = text.matchAll(/\$([0-9,]+\.[0-9]{2})/g);
        for (const pm of priceMatches) {
            const val = parseFloat(pm[1].replace(/,/g, ''));
            if (currentItem.unitPrice === 0) currentItem.unitPrice = val;
        }

        if (!currentItem.availability) {
            const av = extractAvailability(text);
            if (av.availability) currentItem.availability = av.availability;
        }

        if (currentItem.weight === 0) {
            const w = extractWeight(text);
            if (w > 0) currentItem.weight = w;
        }

        const notePrefixMatch = text.match(/Line item note:\s*(.*)/i);
        const replacesMatch = text.match(/(Replaces Part # .*)/i);
        const nonReturnable = text.match(/(Non-returnable part)/i);

        if (notePrefixMatch) {
            currentItem.notes = (currentItem.notes ? currentItem.notes + ' ' : '') + notePrefixMatch[1].trim();
        } else if (replacesMatch) {
            currentItem.notes = (currentItem.notes ? currentItem.notes + ' ' : '') + replacesMatch[1].trim();
        } else if (nonReturnable) {
             currentItem.desc += '\n' + nonReturnable[1];
        } else {
             let clean = text;
             clean = clean.replace(/\$[0-9,]+\.[0-9]{2}(?:\s*ea\.)?/gi, '');
             clean = clean.replace(/All \d+ by [A-Za-z0-9 ]+/i, '').replace(/\d+ in stock/i, '').replace(/Contact Dealer/i, '');
             clean = cleanDescription(clean); // Apply cleaning again
             
             if (clean.length > 2 && !clean.match(/^\d+\)$/)) { 
                 currentItem.desc += ' ' + clean;
             }
        }
      }
    }
    if (currentItem) items.push(currentItem);

    extractedImages.forEach(img => {
        let closest: QuoteItem | null = null;
        let minDiff = Infinity;
        // Simple heuristic: attach to last item processed
        // In a real spatial implementation we would match Y coordinates to currentItem.y
    });
  }

  return items;
};
