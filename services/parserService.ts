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
  const m = String(text).match(/(\d{1,4}(?:\.\d+)?)\s*(lb|lbs|1bs|kg|kgs|kilogram|kilograms|k\.g\.)\b/i);
  if (!m) return 0;
  
  const val = parseFloat(m[1]);
  const unit = (m[2] || "").toLowerCase();
  
  // Normalize everything to LBS for internal storage
  if (unit.includes("kg") || unit.includes("kilogram") || unit.includes("k.g")) {
      return val * 2.20462;
  }
  
  return val;
}

/**
 * GENIUS LEVEL PRICE EXTRACTION LOGIC
 * Determines the correct Unit Price from a cloud of numbers on a line.
 */
function determineCorrectPrice(text: string, qty: number): number {
    // 1. Extract ALL dollar amounts
    const matches = [...text.matchAll(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g)];
    let prices = matches.map(m => parseFloat(m[1].replace(/,/g, "")));
    
    // Filter out obvious noise (0.00)
    prices = prices.filter(p => p > 0.01);
    
    // Remove duplicates
    prices = [...new Set(prices)];

    // Sort Descending (Highest to Lowest)
    prices.sort((a, b) => b - a);

    if (prices.length === 0) return 0;

    // STRATEGY A: Explicit Labeling "@ $X.XX" or "$X.XX ea"
    // This overrides almost everything else because it is explicit.
    const explicitUnitMatch = text.match(/(@|ea\.?|each)\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i) 
                           || text.match(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(ea|each|@)/i);
    
    if (explicitUnitMatch) {
        // Find which group has the number
        const valStr = explicitUnitMatch[1].match(/\d/) ? explicitUnitMatch[1] : explicitUnitMatch[2];
        const val = parseFloat(valStr.replace(/,/g, ""));
        // Sanity check: If this explicit price matches one of our extracted prices, return it.
        // We use a small epsilon for float comparison.
        if (prices.some(p => Math.abs(p - val) < 0.01)) {
            return val;
        }
    }

    // STRATEGY B: Single Item Logic (Qty = 1)
    if (qty === 1) {
        // If Qty is 1, Unit Price == Total Price.
        // We want the HIGHEST price found.
        // Why? Lower prices are usually "Savings", "Discount", "Tax", or "Unit Weight" misread as price.
        // The user specifically wants to markup the BASE price.
        return prices[0]; // Max price
    }

    // STRATEGY C: Multiple Items Logic (Qty > 1)
    if (qty > 1) {
        // 1. Mathematical Validation (The "Genius" Check)
        // Does Price A * Qty = Price B?
        // If so, Price A is the Unit Price.
        for (let i = 0; i < prices.length; i++) {
            const potentialTotal = prices[i];
            // Look for a smaller number that multiplies into this total
            const unitMatch = prices.find(p => Math.abs((p * qty) - potentialTotal) < 0.1); // 0.1 tolerance for rounding
            if (unitMatch) {
                return unitMatch;
            }
        }

        // 2. Logic Inference
        // If we have multiple prices, the largest is almost certainly the Extended Total.
        // We should ignore the largest and take the next largest (which is likely the Unit Price).
        if (prices.length >= 2) {
            // Check if the largest is significantly bigger than the second largest (e.g., > 1.5x)
            // This suggests it really is a Total.
            if (prices[0] > (prices[1] * 1.1)) {
                return prices[1]; // Return 2nd highest (Unit Price)
            }
        }
        
        // 3. Fallback: Safety Division
        // If we only have ONE price and Qty > 1, that price is ambiguous.
        // It could be the Unit Price (if column detection failed) or the Total.
        // However, usually PDF extraction gets the Total.
        // We can't know for sure. But based on user feedback "prices decreased", 
        // it means we likely picked a too-small number before.
        // If we pick the Max here, we risk over-quoting (Total * Qty).
        // BUT, picking the Max is safer for the "Increase" requirement than picking a tiny fee.
        
        // Let's rely on the explicit sorted list. If we couldn't match math, 
        // and we have >1 prices, we took the 2nd highest.
        // If we have 1 price: assume it is the Unit Price (Standard Invoice format often lists Unit Price).
        // Extended price is often far to the right and might be missed in column cutoffs, 
        // whereas Unit Price is central.
        return prices[0];
    }

    return prices[0];
}

// --- Main Parsers ---

export const parseTextData = (text: string): QuoteItem[] => {
  const raw = String(text || "");
  let items: QuoteItem[] = [];

  // --- STRATEGY 1: LINE ITEM SPLITTING (Robust for Invoices with Line Numbers) ---
  const lineStartRegex = /(?:^|\n)\s*(\d+)\)\s+/g;
  const lineMatches = [...raw.matchAll(lineStartRegex)];

  if (lineMatches.length > 0) {
      console.log("Detected Line Item Format. Using Strategy 1.");
      for (let i = 0; i < lineMatches.length; i++) {
          const start = lineMatches[i].index!;
          const end = (i + 1 < lineMatches.length) ? lineMatches[i+1].index! : raw.length;
          const block = raw.substring(start, end);
          
          // Pre-extract Qty to help Price Determination
          let qty = 1;
          const currentLineNum = lineMatches[i][1];
          const qtyMatch = block.match(new RegExp(`(?:^|\\n)\\s*${currentLineNum}\\)\\s+(\\d+)`));
          if (qtyMatch) {
              qty = parseInt(qtyMatch[1]);
          }

          // 1. Identify Price using Genius Logic
          let unitPrice = determineCorrectPrice(block, qty);
          if (unitPrice === 0) continue; 

          // 2. Extract Weight
          const weight = extractWeight(block);

          // 3. Extract Part No
          const partPattern = /(?:\b[0-9A-Z]{1,5}-[0-9A-Z]{3,7}\b|\b[0-9]{5,8}\b(?=\s*:?|[A-Z]))/i;
          const partMatch = block.match(partPattern);
          let partNo = "";
          
          if (partMatch) {
               if (!/^\d{1,4}$/.test(partMatch[0])) {
                   partNo = partMatch[0];
               }
          }
          
          if (!partNo) {
               const colonMatch = block.match(/([A-Z0-9\-]{5,12}):/);
               if (colonMatch) partNo = colonMatch[1];
          }
          if (partNo.endsWith("-")) partNo = partNo.slice(0, -1);
          if (!partNo) partNo = `ITEM-${i+1}`;

          // Re-check Qty via PartNo proximity if initial check failed
          if (qty === 1 && partNo) {
             const escPart = partNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
             const qm = block.match(new RegExp(`(?:^|[\\s\\n",])(\\d{1,5})\\s*(?=["']?${escPart})`, 'i'));
             if (qm) qty = parseInt(qm[1]);
          }

          // 5. Extract Description
          let desc = cleanDescription(block);
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

  // --- STRATEGY 2: PRICE-BASED SPLITTING (Fallback) ---
  const pricePattern = /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*ea\.?\b/gi;
  
  let hits = [];
  let m;
  while ((m = pricePattern.exec(raw)) !== null) {
      hits.push({ index: m.index, unitPrice: parseFloat(m[1].replace(/,/g, "")), fullLen: m[0].length });
  }

  for (let i = 0; i < hits.length; i++) {
      const start = i === 0 ? 0 : (hits[i-1].index + hits[i-1].fullLen);
      let block = raw.substring(start, hits[i].index);

      // Try to find Qty
      let qty = 1;
      const lineItemMatch = block.match(/(\d+)\)\s+(\d+)/); 
      if (lineItemMatch) {
          qty = parseInt(lineItemMatch[2]);
      }

      // Re-evaluate price for this block using the Genius Logic
      // (The hit only found ONE price, but the block might have others)
      const calculatedPrice = determineCorrectPrice(block, qty);
      const finalPrice = calculatedPrice > 0 ? calculatedPrice : hits[i].unitPrice;

      const partPatternLegacy = /(?:\b[A-Z0-9]{1,5}-[A-Z0-9]{3,7}\b|\b[0-9]{5,10}\b(?=\s*:?|[A-Z]))/ig;
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

      if (!lineItemMatch && partNo) {
          const escPart = partNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const qm = block.match(new RegExp(`(?:^|[\\s\\n",])(\\d{1,5})\\s*(?=["']?${escPart})`, 'i'));
          if (qm) qty = parseInt(qm[1]);
      } 
      if (!partNo) partNo = `ITEM-${i+1}`;

      let desc = cleanDescription(block);
      if (partNo && partNo !== `ITEM-${i+1}`) {
          const parts = desc.split(partNo);
          if (parts.length > 1) desc = parts.pop() || "";
      }
      desc = desc.replace(/^[:\s-]+/g, "").replace(/\s+/g, " ").trim();
      if (!desc) desc = "CAT COMPONENT";

      const weight = extractWeight(block);

      items.push({
          qty,
          partNo,
          desc,
          weight,
          unitPrice: finalPrice
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

/**
 * Refactored PDF Parser using Visual Rows and a State Machine.
 * Handles multi-line descriptions and complex layouts better.
 * Includes aggressive filtering for stray characters and varying densities.
 */
export const parsePdfFile = async (file: File): Promise<QuoteItem[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  // Storage for all visual lines across all pages
  let allRows: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    // 1. Group items by Y-coordinate (Visual Rows)
    const items = content.items
      .map((item: any) => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width || 0,
        height: item.height || 10
      }))
      .filter((item: any) => item.str.trim().length > 0);

    // Sort by Y (descending - top to bottom)
    items.sort((a: any, b: any) => b.y - a.y);

    const rows: any[][] = [];
    if (items.length > 0) {
        let currentRow = [items[0]];
        for (let j = 1; j < items.length; j++) {
            const item = items[j];
            const prevItem = currentRow[0];
            // If Y is close enough, considered same row
            if (Math.abs(item.y - prevItem.y) < (prevItem.height * 0.6)) {
                currentRow.push(item);
            } else {
                rows.push(currentRow);
                currentRow = [item];
            }
        }
        rows.push(currentRow);
    }

    // 2. Convert rows to strings, sorting X (ascending - left to right)
    const rowStrings = rows.map(row => {
        row.sort((a, b) => a.x - b.x);
        return row.map(r => r.str).join(" ").trim();
    });

    allRows = [...allRows, ...rowStrings];
  }
  
  // 3. State Machine Parsing
  const parsedItems: QuoteItem[] = [];
  let currentItem: Partial<QuoteItem> & { rawText: string } | null = null;

  // Regex for Start of Item: "1) 1" or "234-5678" or "1234567"
  const startPattern = /^(?:(\d+)\)\s+(\d+)|(?:[0-9A-Z]{2,5}-[0-9A-Z]{3,7})|(?:[0-9]{6,8}))\b/i;

  const finalizeItem = (item: any) => {
     if (!item) return;
     
     // 1. Qty extraction (CRITICAL for Price Logic)
     let qty = 1;
     const lineQty = item.rawText.match(/^\d+\)\s+(\d+)/);
     const pMatchStart = item.rawText.match(/(?:\b[0-9A-Z]{1,5}-[0-9A-Z]{3,7}\b|\b[0-9]{5,8}\b)/i);
     
     if (lineQty) {
         qty = parseInt(lineQty[1]);
     } else if (pMatchStart) {
         // Try number before part number
         const pNoStr = pMatchStart[0];
         const escP = pNoStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
         const qm = item.rawText.match(new RegExp(`(\\d+)\\s+(?=${escP})`, 'i'));
         if (qm) qty = parseInt(qm[1]);
     }

     // 2. Price Determination (The GENIUS Logic)
     let uPrice = determineCorrectPrice(item.rawText, qty);
     if (uPrice === 0) return; // Not a valid item line

     // Weight: Scan full block
     const weight = extractWeight(item.rawText);

     // Part No: Look for CAT style
     let pNo = "";
     const pMatch = item.rawText.match(/(?:\b[0-9A-Z]{1,5}-[0-9A-Z]{3,7}\b|\b[0-9]{5,8}\b)/i);
     if (pMatch) {
         if (!/^\d{1,4}$/.test(pMatch[0])) pNo = pMatch[0];
     }
     if (!pNo) pNo = "ITEM";

     // Description
     let desc = cleanDescription(item.rawText);
     if (pNo && pNo !== "ITEM") {
         const parts = desc.split(pNo);
         if (parts.length > 1) desc = parts.pop() || "";
     }
     desc = desc.replace(/^[:\s-]+/g, "").replace(/\s+/g, " ").trim();
     if (!desc) desc = "CAT COMPONENT";

     parsedItems.push({
         qty,
         partNo: pNo,
         desc,
         weight,
         unitPrice: uPrice
     });
  };

  for (const rowText of allRows) {
      // Filter total noise
      if (!rowText) continue;
      
      // Enhanced Noise Filtering
      if (rowText.match(/^Page \d/i) || rowText.match(/Invoice|Ship To|Bill To|Sold To|P\.O\.|Date:|Terms:|Due Date/i)) continue;

      if (!/[a-zA-Z0-9]/.test(rowText)) continue;
      if (rowText.length < 3 && !/\d/.test(rowText) && !/ea/i.test(rowText)) continue;

      // Check if this row initiates a new item
      // REQUIREMENT: Must have a price symbol '$' to be considered a valid item start in complex docs
      const isNewItem = startPattern.test(rowText) && rowText.includes('$');

      if (isNewItem) {
          if (currentItem) finalizeItem(currentItem);
          currentItem = { rawText: rowText };
      } else {
          if (currentItem) {
              currentItem.rawText += " " + rowText;
          }
      }
  }

  // Push last item
  if (currentItem) finalizeItem(currentItem);

  if (parsedItems.length > 0) {
      console.log(`Structured PDF Parsing yielded ${parsedItems.length} items.`);
      return parsedItems;
  }

  console.log("Structured parsing failed. Falling back to AI.");
  return await parseDocumentWithAI(allRows.join("\n"));
};