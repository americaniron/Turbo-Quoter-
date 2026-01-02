import { QuoteItem } from '../types.ts';

// --- Helper Functions ---

/**
 * Clean string to remove generic labels and ensure only item details remain.
 */
function cleanDescription(text: string): string {
  if (!text) return "CAT COMPONENT";
  
  let cleaned = String(text)
    // Remove known noise phrases and Financial Headers
    .replace(/Ring Power|RING POWER CORPORATION|Tampa|Riverview|Fern Hill|Order Information|Pickup Location|Pickup Method|SUMMARY OF CHARGES|Items In Your Order|Non-returnable part|Availability|Notes|Quantity|Product Description|Product Description Notes|Total Price|Line Item|Unit Price|Extended Price|Weight|Date|Invoice|Page|Reference|Ship To|Bill To/gi, "")
    // Remove specific financial noise reported by user
    .replace(/SHIPPING\/MISCELLANEOUS|TOTAL TAX|ORDER TOTAL|SUBTOTAL|\(USD\)|USD|TAX:/gi, "")
    // Remove standalone prices that might be in the description (e.g. the order total value)
    .replace(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, "")
    // Remove quotes
    .replace(/["']/g, "")
    .trim();

  // Remove leading numbers if they look like line numbers (e.g. "1) ")
  cleaned = cleaned.replace(/^\d+\)\s*/, "");
  
  return cleaned;
}

/**
 * Extract weight and normalize to LBS.
 */
function extractWeight(text: string): number {
  const m = String(text).match(/(\d{1,4}(?:\.\d+)?)\s*(lb|lbs|kg|kg\.)\b/i);
  if (!m) return 0;
  
  const val = parseFloat(m[1]);
  const unit = (m[2] || "").toLowerCase();
  
  return unit.includes("kg") ? val * 2.2046 : val;
}

// --- Main Parsers ---

export const parseTextData = (text: string): QuoteItem[] => {
  const raw = String(text || "");
  const items: QuoteItem[] = [];
  
  // STRICT PATTERN: Looks specifically for "$XX.XX ea". 
  // This prevents grabbing the Extended Price (Total) and treating it as Unit Price.
  const pricePattern = /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*ea\b/gi;
  
  // Generic Part Number Pattern
  const partPattern = /(?:\b[A-Z0-9]{1,5}-[A-Z0-9]{3,7}\b|\b[A-Z0-9]{5,10}\b(?=\s*:?|[A-Z]))/ig;

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

      // --- CRITICAL FIX: Header Removal ---
      // If this is the first block, or if we detect a distinct Line Item pattern (e.g. "1) 5"),
      // we try to slice the block to start AT that pattern to ignore headers/previous junk.
      // Matches "1) 5" or "10) 12" (LineNumber) (Space) (Quantity)
      const lineItemMatch = block.match(/(\d+)\)\s+(\d+)/); 
      if (lineItemMatch) {
          // If found, discard everything before the "1) "
          const matchIndex = block.indexOf(lineItemMatch[0]);
          if (matchIndex > -1) {
             block = block.substring(matchIndex);
          }
      }

      // A. Extract Part Number from the block
      let possibleParts = [];
      let pm;
      // RESET REGEX LASTINDEX for every new block!
      partPattern.lastIndex = 0;
      
      while ((pm = partPattern.exec(block)) !== null) {
          if (!/^\d{1,4}$/.test(pm[0])) { 
              possibleParts.push({val: pm[0], idx: pm.index});
          }
      }
      
      let partNo = "";
      // Try to find "PartNo:" explicit label
      let colonMatch = block.match(/([A-Z0-9\-]{5,12}):/);
      
      if (colonMatch) {
          partNo = colonMatch[1];
      } else if (possibleParts.length > 0) {
          // Otherwise take the last candidate which is usually closest to the description/price
          partNo = possibleParts[possibleParts.length - 1].val;
      }

      if (partNo && partNo.endsWith("-")) partNo = partNo.slice(0, -1);

      // B. Extract Quantity from the block (look for number preceding partNo)
      let qty = 1;
      // First, check if we have the "1) 5" pattern we found earlier to use as explicit quantity
      if (lineItemMatch) {
          qty = parseInt(lineItemMatch[2]);
      } else if (partNo) {
          // Fallback: look for number near the part number
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
      
      // Cleanup description formatting
      desc = desc.replace(/^[:\s-]+/g, "").replace(/\s+/g, " ").trim();
      // Expanded length limit to prevent cutting off
      desc = desc.substring(0, 300) || "CAT COMPONENT";

      // D. Extract Weight from the block (this fixes the missing weights issue)
      const weight = extractWeight(block);

      items.push({
          qty,
          partNo: partNo || `ITEM-${i+1}`,
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
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    // Simple text concatenation often works better for regex block parsing 
    // than complex spatial reconstruction for this specific document type.
    const pageText = content.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }
  
  return parseTextData(fullText);
};