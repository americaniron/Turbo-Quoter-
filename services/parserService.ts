import { QuoteItem } from '../types.ts';
import { parseDocumentWithAI } from './geminiService.ts';

// --- Helper Functions ---

/**
 * Clean string to remove generic labels and ensure only item details remain.
 */
function cleanDescription(text: string): string {
  if (!text) return "CAT COMPONENT";
  
  let cleaned = String(text)
    // Remove known noise phrases and Financial Headers
    .replace(/Ring Power|RING POWER CORPORATION|Tampa|Riverview|Fern Hill|Order Information|Pickup Location|Pickup Method|SUMMARY OF CHARGES|Items In Your Order|Availability|Notes|Quantity|Product Description|Product Description Notes|Total Price|Line Item|Unit Price|Extended Price|Weight|Date|Invoice|Page|Reference|Ship To|Bill To/gi, "")
    // Remove specific financial noise
    .replace(/SHIPPING\/MISCELLANEOUS|TOTAL TAX|ORDER TOTAL|SUBTOTAL|\(USD\)|USD|TAX:/gi, "")
    // Remove standalone prices that might be in the description
    .replace(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, "")
    // Remove "Non-returnable part" and similar status messages
    .replace(/Non-returnable part|Factory Stock|Backorder/gi, "")
    // Remove Availability patterns (e.g. "All 4 by Jan 02", "8 in stock")
    .replace(/All\s+\d+\s+by\s+[A-Za-z]{3}\s+\d{1,2}/gi, "")
    .replace(/\d+\s+in\s+stock/gi, "")
    // Remove Weight strings (e.g. "0.1 lbs") from description to keep it clean
    .replace(/\d{1,4}(?:\.\d+)?\s*(?:lb|lbs|kg|kgs)\b/gi, "")
    // Remove quotes
    .replace(/["']/g, "")
    .trim();

  // Remove leading numbers if they look like line numbers (e.g. "1) " or "1 ")
  cleaned = cleaned.replace(/^\d+\)\s*/, "").replace(/^\d+\s+/, "");
  
  return cleaned;
}

/**
 * Extract weight and normalize to LBS.
 */
function extractWeight(text: string): number {
  // Enhanced regex to catch more unit variations (lbs, kg, kgs, kilogram, etc.)
  // We match the first occurrence of a number followed by a weight unit.
  const m = String(text).match(/(\d{1,4}(?:\.\d+)?)\s*(lb|lbs|kg|kgs|kilogram|kilograms|k\.g\.)\b/i);
  if (!m) return 0;
  
  const val = parseFloat(m[1]);
  const unit = (m[2] || "").toLowerCase();
  
  // Normalize everything to LBS for internal storage
  if (unit.includes("kg") || unit.includes("kilogram")) {
      return val * 2.20462;
  }
  
  return val;
}

// --- Main Parsers ---

export const parseTextData = (text: string): QuoteItem[] => {
  const raw = String(text || "");
  let items: QuoteItem[] = [];

  // --- STRATEGY 1: LINE ITEM SPLITTING (Robust for Invoices with Line Numbers) ---
  // Detects "4) ", "5) " pattern common in the provided PDF.
  // This is superior because it captures everything between "4)" and "5)", including weights 
  // that might appear on a line *after* the price.
  const lineStartRegex = /(?:^|\n)\s*(\d+)\)\s+/g;
  const lineMatches = [...raw.matchAll(lineStartRegex)];

  if (lineMatches.length > 0) {
      console.log("Detected Line Item Format. Using Strategy 1.");
      for (let i = 0; i < lineMatches.length; i++) {
          const start = lineMatches[i].index!;
          const end = (i + 1 < lineMatches.length) ? lineMatches[i+1].index! : raw.length;
          const block = raw.substring(start, end);

          // 1. Identify Price (Unit Price preferred over Total)
          // Look for "ea" price match first (e.g. "$10.58 ea")
          let unitPrice = 0;
          const priceEaMatch = block.match(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*ea/i);
          
          if (priceEaMatch) {
             unitPrice = parseFloat(priceEaMatch[1].replace(/,/g, ""));
          } else {
             // Fallback: Check for any price. If multiple exist (Total vs Unit), usually Unit is smaller.
             const prices = [...block.matchAll(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g)]
                .map(p => parseFloat(p[1].replace(/,/g, "")));
             
             if (prices.length > 0) {
                 unitPrice = Math.min(...prices);
             }
          }

          if (unitPrice === 0) continue; // Skip if no price found (likely not an item line)

          // 2. Extract Weight (Searches entire block, including lines after price)
          const weight = extractWeight(block);

          // 3. Extract Part No
          const partPattern = /(?:\b[A-Z0-9]{1,5}-[A-Z0-9]{3,7}\b|\b[A-Z0-9]{5,10}\b(?=\s*:?|[A-Z]))/i;
          const partMatch = block.match(partPattern);
          let partNo = "";
          
          // Avoid matching simple numbers as parts
          if (partMatch && !/^\d+$/.test(partMatch[0])) {
               partNo = partMatch[0];
          } else {
               // Try looking for colon pattern e.g. "388-7501:"
               const colonMatch = block.match(/([A-Z0-9\-]{5,12}):/);
               if (colonMatch) partNo = colonMatch[1];
          }
          if (partNo.endsWith("-")) partNo = partNo.slice(0, -1);
          if (!partNo) partNo = `ITEM-${i+1}`;

          // 4. Extract Qty
          // Pattern: "4) 4" -> Line 4, Qty 4.
          // We use the line number from the match to construct a specific regex for this line.
          let qty = 1;
          const currentLineNum = lineMatches[i][1];
          const qtyMatch = block.match(new RegExp(`(?:^|\\n)\\s*${currentLineNum}\\)\\s+(\\d+)`));
          
          if (qtyMatch) {
              qty = parseInt(qtyMatch[1]);
          } else if (partNo) {
             // Fallback: look for number preceding partNo
             const escPart = partNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
             const qm = block.match(new RegExp(`(?:^|[\\s\\n",])(\\d{1,5})\\s*(?=["']?${escPart})`, 'i'));
             if (qm) qty = parseInt(qm[1]);
          }

          // 5. Extract Description
          let desc = cleanDescription(block);
          // Try to remove Part No from description if present
          if (partNo && partNo !== `ITEM-${i+1}`) {
              const parts = desc.split(partNo);
              if (parts.length > 1) desc = parts.pop() || "";
          }
          
          desc = desc.replace(/^[:\s-]+/g, "").replace(/\s+/g, " ").trim();
          if (!desc) desc = "CAT COMPONENT";

          items.push({ qty, partNo, desc, weight, unitPrice });
      }
      
      return items;
  }

  // --- STRATEGY 2: PRICE-BASED SPLITTING (Legacy Fallback) ---
  // Use this if no line numbers are found (e.g. simple lists)
  
  // STRICT PATTERN: Looks specifically for "$XX.XX ea". 
  const pricePattern = /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*ea\.?\b/gi;
  
  let hits = [];
  let m;
  // 1. Find all Price occurrences first
  while ((m = pricePattern.exec(raw)) !== null) {
      hits.push({ index: m.index, unitPrice: parseFloat(m[1].replace(/,/g, "")), fullLen: m[0].length });
  }

  // 2. Iterate through price hits and define "Blocks" of text preceding them
  for (let i = 0; i < hits.length; i++) {
      const start = i === 0 ? 0 : (hits[i-1].index + hits[i-1].fullLen);
      let block = raw.substring(start, hits[i].index);

      // Matches "4) 4" (LineNumber) (Space) (Quantity)
      const lineItemMatch = block.match(/(\d+)\)\s+(\d+)/); 
      if (lineItemMatch) {
          const matchIndex = block.indexOf(lineItemMatch[0]);
          if (matchIndex > -1) {
             block = block.substring(matchIndex);
          }
      }

      // A. Extract Part Number
      const partPatternLegacy = /(?:\b[A-Z0-9]{1,5}-[A-Z0-9]{3,7}\b|\b[A-Z0-9]{5,10}\b(?=\s*:?|[A-Z]))/ig;
      let partNo = "";
      const colonMatch = block.match(/([A-Z0-9\-]{5,12}):/);
      if (colonMatch) {
          partNo = colonMatch[1];
      } else {
          const partMatches = [...block.matchAll(partPatternLegacy)];
          const validParts = partMatches.filter(m => !/^\d{1,4}$/.test(m[0]));
          if (validParts.length > 0) {
             partNo = validParts[validParts.length - 1][0];
          }
      }
      if (partNo.endsWith("-")) partNo = partNo.slice(0, -1);

      // B. Extract Quantity
      let qty = 1;
      if (lineItemMatch) {
          qty = parseInt(lineItemMatch[2]);
      } else if (partNo) {
          const escPart = partNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const qm = block.match(new RegExp(`(?:^|[\\s\\n",])(\\d{1,5})\\s*(?=["']?${escPart})`, 'i'));
          if (qm) qty = parseInt(qm[1]);
      } else {
          partNo = `ITEM-${i+1}`;
      }

      // C. Extract Description
      let desc = cleanDescription(block);
      if (partNo && partNo !== `ITEM-${i+1}`) {
          const parts = desc.split(partNo);
          if (parts.length > 1) desc = parts.pop() || "";
      }
      desc = desc.replace(/^[:\s-]+/g, "").replace(/\s+/g, " ").trim();
      if (!desc) desc = "CAT COMPONENT";

      // D. Extract Weight
      const weight = extractWeight(block);

      items.push({
          qty,
          partNo,
          desc,
          weight,
          unitPrice: hits[i].unitPrice
      });
  }
  
  return items;
};

export const parseExcelFile = async (file: File): Promise<QuoteItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = window.XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = window.XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length < 2) {
          resolve([]);
          return;
        }

        const headers = rows[0].map((h: any) => String(h).toLowerCase());
        const getIdx = (keys: string[]) => headers.findIndex((h: string) => keys.some(k => h.includes(k)));

        const qi = getIdx(['qty', 'quantity']);
        const pi = getIdx(['part', 'pn', 'number']);
        const di = getIdx(['desc', 'description']);
        const ci = getIdx(['price', 'unit', 'cost']);
        const wi = getIdx(['weight', 'wt']);

        const items: QuoteItem[] = rows.slice(1)
          .map(r => ({
            qty: qi > -1 ? (parseInt(r[qi]) || 1) : 1,
            partNo: pi > -1 ? String(r[pi] || "CAT-PART") : "CAT-PART",
            desc: di > -1 ? String(r[di] || "CAT COMPONENT") : "CAT COMPONENT",
            unitPrice: ci > -1 ? parseFloat(String(r[ci] || "0").replace(/[^0-9.]/g, "")) : 0,
            weight: wi > -1 ? parseFloat(String(r[wi] || "0")) : 0
          }))
          .filter(x => x.unitPrice > 0);

        resolve(items);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const parsePdfFile = async (file: File): Promise<QuoteItem[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullStructureText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    // Improved extraction: Sort by Y (top to bottom) then X (left to right)
    const items = content.items.map((item: any) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width || 0,
      hasEOL: item.hasEOL
    }));

    // Sort by Y descending (top to bottom), then X ascending
    items.sort((a: any, b: any) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 4) return yDiff; // Row tolerance
      return a.x - b.x; // Same line sorting
    });

    // Reconstruct Layout visually
    let lastY = -1;
    let lastXEnd = 0;
    let pageText = "";

    for (const item of items) {
      // New line detection
      if (lastY !== -1 && Math.abs(item.y - lastY) > 4) {
        pageText += "\n";
        lastXEnd = 0;
      }
      
      // Column spacing detection
      if (lastXEnd > 0) {
          const gap = item.x - lastXEnd;
          if (gap > 20) {
              pageText += "   "; // Wide gap -> column break
          } else if (gap > 4) {
              pageText += " "; // Small gap -> word break
          }
      }
      
      pageText += item.str;
      lastY = item.y;
      lastXEnd = item.x + item.width;
    }
    
    fullStructureText += pageText + "\n";
  }
  
  // Attempt 1: Standard Regex Parsing
  const regexItems = parseTextData(fullStructureText);
  
  // SMART FALLBACK:
  // If regex returns very few items (< 3) but the document is large, it might be a false positive.
  // FORCE AI parsing in that case.
  const seemsValid = regexItems.length > 2 || (regexItems.length > 0 && fullStructureText.length < 500);

  if (seemsValid) {
    console.log("Regex parsing successful:", regexItems.length, "items");
    return regexItems;
  }

  // Attempt 2: AI Fallback (Gemini 2.5 Flash)
  console.log(`Regex yielded ${regexItems.length} items (unsure). Falling back to AI for robust parsing...`);
  return await parseDocumentWithAI(fullStructureText);
};