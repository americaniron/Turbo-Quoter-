import { QuoteItem } from '../types.ts';
import { parseDocumentWithAI } from './geminiService.ts';

// --- Helper Functions ---

/**
 * Clean string to remove generic labels and ensure only item details remain.
 * UPDATED: Optimized to be "Inclusive" of technical specs while removing admin noise.
 */
function cleanDescription(text: string): string {
  if (!text) return "CAT COMPONENT";
  
  // 1. First, remove specific invoice/document artifacts that are definitely noise.
  let cleaned = String(text)
    // Remove Admin/Layout Headers
    .replace(/Ring Power|RING POWER CORPORATION|Tampa|Riverview|Fern Hill|Order Information|Pickup Location|Pickup Method|SUMMARY OF CHARGES|Items In Your Order|Page \d+ of \d+|Invoice No|Document Date/gi, "")
    // Remove Column Headers (Be careful not to remove 'Weight' if it's part of a spec like 'Counterweight')
    .replace(/\b(Unit Price|Extended Price|Total Price|Product Description|Line Item)\b/gi, "")
    // Remove Financial Noise
    .replace(/SHIPPING\/MISCELLANEOUS|TOTAL TAX|ORDER TOTAL|SUBTOTAL|\(USD\)|USD|TAX:/gi, "")
    // Remove standalone prices/totals that might be floating in the text
    .replace(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, "")
    // Remove Status messages, but keep "Kit" or "Set" related info if possible
    .replace(/Non-returnable part|Factory Stock|Backorder|Subject to availability/gi, "")
    // Remove Warehouse/Availability codes
    .replace(/All\s+\d+\s+by\s+[A-Za-z]{3}\s+\d{1,2}/gi, "")
    .replace(/\d+\s+in\s+stock/gi, "")
    // Remove Quotes
    .replace(/["']/g, "")
    .trim();

  // 2. Remove leading line numbers (e.g., "1) ", "10 ", "001 ")
  cleaned = cleaned.replace(/^(?:\d{1,4}\s*[:.)-]\s*)+/, "");

  // 3. Clean up excessive whitespace created by removals
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  
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
          
          let qty = 1;
          const currentLineNum = lineMatches[i][1];
          const qtyMatch = block.match(new RegExp(`(?:^|\\n)\\s*${currentLineNum}\\)\\s+(\\d+)`));
          if (qtyMatch) {
              qty = parseInt(qtyMatch[1]);
          }

          let unitPrice = determineCorrectPrice(block, qty);
          if (unitPrice === 0) continue; 

          const weight = extractWeight(block);

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

          if (qty === 1 && partNo) {
             const escPart = partNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
             const qm = block.match(new RegExp(`(?:^|[\\s\\n",])(\\d{1,5})\\s*(?=["']?${escPart})`, 'i'));
             if (qm) qty = parseInt(qm[1]);
          }

          let desc = cleanDescription(block);
          // Only split by partNo if partNo is actually IN the description string to avoid deleting random numbers
          if (partNo && partNo !== `ITEM-${i+1}` && desc.includes(partNo)) {
              const parts = desc.split(partNo);
              // Take the part after the part number, as usually Desc follows PartNo
              if (parts.length > 1) desc = parts.slice(1).join(" ");
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
      if (partNo && partNo !== `ITEM-${i+1}` && desc.includes(partNo)) {
          const parts = desc.split(partNo);
          if (parts.length > 1) desc = parts.slice(1).join(" ");
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
        const rows: any[][] = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (!rows || rows.length === 0) {
          resolve([]);
          return;
        }

        // 1. Intelligent Header Detection
        // Scan first 25 rows to find the "Attribute Layer"
        let headerIdx = -1;
        const colMap = { qty: -1, part: -1, desc: -1, price: -1, weight: -1 };
        
        const terms = {
            part: ['part', 'number', 'item', 'sku', 'pn', 'material'],
            desc: ['description', 'desc', 'product', 'name', 'details'],
            qty: ['qty', 'quantity', 'count', 'pcs'],
            price: ['price', 'unit', 'cost', 'rate', 'ea'],
            weight: ['weight', 'wt', 'lbs', 'kg']
        };

        const normalize = (s: any) => String(s).toLowerCase().replace(/[^a-z]/g, '');

        for (let i = 0; i < Math.min(rows.length, 25); i++) {
            const row = rows[i];
            // Check row for critical mass of keywords
            let matches = 0;
            const cells = row.map(normalize);
            
            if (cells.some(c => terms.part.some(t => c.includes(t)))) matches++;
            if (cells.some(c => terms.price.some(t => c.includes(t)))) matches++;
            if (cells.some(c => terms.desc.some(t => c.includes(t)))) matches++;
            
            if (matches >= 2) {
                headerIdx = i;
                // Map columns
                row.forEach((cellRaw: any, idx: number) => {
                    const cell = normalize(cellRaw);
                    if (terms.qty.some(t => cell.includes(t))) colMap.qty = idx;
                    else if (terms.price.some(t => cell.includes(t)) && !cell.includes('total') && !cell.includes('ext')) colMap.price = idx;
                    else if (terms.part.some(t => cell.includes(t))) colMap.part = idx;
                    else if (terms.desc.some(t => cell.includes(t))) colMap.desc = idx;
                    else if (terms.weight.some(t => cell.includes(t))) colMap.weight = idx;
                });
                break;
            }
        }

        // 2. Data Extraction
        const items: QuoteItem[] = [];
        const startRow = headerIdx === -1 ? 0 : headerIdx + 1;

        // Fallback mapping if no header found (Column Position Guessing)
        if (headerIdx === -1) {
             // Heuristic: If 4+ columns, assume A=Part, B=Desc, C=Qty, D=Price
             colMap.part = 0;
             colMap.desc = 1;
             colMap.qty = 2;
             colMap.price = 3;
        }

        for (let i = startRow; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            
            // Skip footer/total rows
            const rowStr = row.join('').toLowerCase();
            if ((rowStr.includes('total') || rowStr.includes('subtotal')) && rowStr.length < 50) continue;

            // Extract Values
            const getVal = (idx: number) => (idx > -1 && row[idx] !== undefined) ? row[idx] : null;

            // Qty
            let qty = 1;
            const rawQty = getVal(colMap.qty);
            if (rawQty !== null) {
                const q = parseInt(String(rawQty).replace(/[^0-9]/g, ''));
                if (q > 0) qty = q;
            }

            // Price
            let unitPrice = 0;
            const rawPrice = getVal(colMap.price);
            if (rawPrice !== null) {
                if (typeof rawPrice === 'number') unitPrice = rawPrice;
                else {
                    const p = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
                    if (!isNaN(p)) unitPrice = p;
                }
            }

            // Part
            let partNo = "CAT-PART";
            const rawPart = getVal(colMap.part);
            if (rawPart) partNo = String(rawPart).trim();
            else if (headerIdx === -1 && typeof row[0] === 'string') partNo = row[0]; // Fallback

            // Desc
            let desc = "CAT COMPONENT";
            const rawDesc = getVal(colMap.desc);
            if (rawDesc) desc = cleanDescription(String(rawDesc));
            else if (headerIdx === -1 && typeof row[1] === 'string') desc = cleanDescription(row[1]); // Fallback

            // Weight
            let weight = 0;
            const rawWeight = getVal(colMap.weight);
            if (rawWeight) weight = extractWeight(String(rawWeight));

            // Heuristic Fixes for "No Header" mode
            if (headerIdx === -1) {
                 // Try to find a price in the row if we missed it
                 if (unitPrice === 0) {
                     const num = row.find((c: any) => typeof c === 'number' && c > 0);
                     if (num) unitPrice = num;
                 }
            }

            if (unitPrice > 0) {
                items.push({ qty, partNo, desc, weight, unitPrice });
            }
        }

        resolve(items);
      } catch (err) {
        console.error("Excel Parsing Error", err);
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
     // Only split if partNo exists and is distinct from the item label
     if (pNo && pNo !== "ITEM" && desc.includes(pNo)) {
         const parts = desc.split(pNo);
         if (parts.length > 1) desc = parts.slice(1).join(" ");
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
      
      // Enhanced Noise Filtering, but PERMISSIVE for continuation lines
      if (rowText.match(/^Page \d/i) || rowText.match(/Invoice|Ship To|Bill To|Sold To|P\.O\.|Date:|Terms:|Due Date/i)) continue;
      
      // Stop scanning if we hit the Totals section
      if (rowText.match(/Subtotal|Total Tax|Total Amount|Balance Due/i)) break;

      // Check if this row initiates a new item
      // REQUIREMENT: Must have a price symbol '$' to be considered a valid item start in complex docs
      const isNewItem = startPattern.test(rowText) && rowText.includes('$');

      if (isNewItem) {
          if (currentItem) finalizeItem(currentItem);
          currentItem = { rawText: rowText };
      } else {
          // INCLUSIVE DESCRIPTION LOGIC:
          // If we have an active item, assume this line is a continuation of the description
          // (e.g. "Includes Seals", "Dim: 5x5") unless it looks like a page footer.
          if (currentItem) {
              // Only filter really garbage characters if appending
              if (/[a-zA-Z0-9]/.test(rowText)) {
                  currentItem.rawText += " " + rowText;
              }
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