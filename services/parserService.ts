
import { QuoteItem } from '../types.ts';
import { parseDocumentWithAI } from './geminiService.ts';

// --- Helper Functions ---

/**
 * Extracts availability information from the text line.
 * Returns the availability string and the text with availability removed.
 */
function extractAvailability(text: string): { availability: string, remainingText: string } {
    const availPatterns = [
        /All\s+\d+\s+by\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{2,4})?/i,
        /All\s+\d+\s+by\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i,
        /\d+\s+in\s+stock/i,
        /\bIn\s+Stock\b/i,
        /Factory\s+Stock/i,
        /Backorder/i,
        /Subject\s+to\s+availability/i,
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
 * Clean string to remove generic labels and ensure only item details remain.
 * UPDATED: Aggressively removes 3rd party dealer info.
 */
function cleanDescription(text: string): string {
  if (!text) return "CAT COMPONENT";
  
  let cleaned = String(text)
    // STRICT PRIVACY FILTER: Remove known 3rd party dealers and locations
    .replace(/Ring Power|RING POWER CORPORATION|Tampa|Riverview|Fern Hill|025069|ADAM qadah|adam@americanyellowiron\.com/gi, "")
    .replace(/10421 Fern Hill Dr\.|813-671-3700|33578|United States|Florida/gi, "")
    // Layout and Admin Noise
    .replace(/Order Information|Pickup Location|Pickup Method|SUMMARY OF CHARGES|Items In Your Order|Page \d+ of \d+|Invoice No|Document Date/gi, "")
    .replace(/\b(Unit Price|Extended Price|Total Price|Product Description|Line Item|Availability)\b/gi, "")
    .replace(/SHIPPING\/MISCELLANEOUS|TOTAL TAX|ORDER TOTAL|SUBTOTAL|\(USD\)|USD|TAX:|Credit Card|Billing Address/gi, "")
    .replace(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, "")
    .replace(/Non-returnable part/gi, "")
    .replace(/["']/g, "")
    .trim();

  cleaned = cleaned.replace(/^(?:\d{1,4}\s*[:.)-]\s*)+/, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  
  return cleaned;
}

/**
 * Extract weight and normalize to LBS.
 */
function extractWeight(text: string): number {
  const m = String(text).match(/(\d{1,4}(?:\.\d+)?)\s*(lb|lbs|1bs|kg|kgs|kilogram|kilograms|k\.g\.)\b/i);
  if (!m) return 0;
  
  const val = parseFloat(m[1]);
  const unit = (m[2] || "").toLowerCase();
  
  if (unit.includes("kg") || unit.includes("kilogram") || unit.includes("k.g")) {
      return val * 2.20462;
  }
  
  return val;
}

/**
 * Price Extraction Logic
 */
function determineCorrectPrice(text: string, qty: number): number {
    const matches = [...text.matchAll(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g)];
    let prices = matches.map(m => parseFloat(m[1].replace(/,/g, "")));
    prices = prices.filter(p => p > 0.01);
    prices = [...new Set(prices)];
    prices.sort((a, b) => b - a);

    if (prices.length === 0) return 0;

    const explicitUnitMatch = text.match(/(@|ea\.?|each)\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i) 
                           || text.match(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(ea|each|@)/i);
    
    if (explicitUnitMatch) {
        const valStr = explicitUnitMatch[1].match(/\d/) ? explicitUnitMatch[1] : explicitUnitMatch[2];
        const val = parseFloat(valStr.replace(/,/g, ""));
        if (prices.some(p => Math.abs(p - val) < 0.01)) {
            return val;
        }
    }

    if (qty === 1) return prices[0];

    if (qty > 1) {
        for (let i = 0; i < prices.length; i++) {
            const potentialTotal = prices[i];
            const unitMatch = prices.find(p => Math.abs((p * qty) - potentialTotal) < 0.1); 
            if (unitMatch) {
                return unitMatch;
            }
        }
        return prices[0];
    }

    return prices[0];
}

function multiplyMatrix(m1: number[], m2: number[]): number[] {
    return [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3] * m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
    ];
}

export const parseTextData = (text: string): QuoteItem[] => {
  const raw = String(text || "");
  let items: QuoteItem[] = [];

  const lineStartRegex = /(?:^|\n)\s*(\d+)\)\s+/g;
  const lineMatches = [...raw.matchAll(lineStartRegex)];

  if (lineMatches.length > 0) {
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
          const { availability, remainingText } = extractAvailability(block);

          const partPattern = /(?:\b[0-9A-Z]{1,5}-[0-9A-Z]{3,7}\b|\b[0-9]{5,8}\b(?=\s*:?|[A-Z]))/i;
          const partMatch = remainingText.match(partPattern);
          let partNo = "";
          
          if (partMatch) {
               if (!/^\d{1,4}$/.test(partMatch[0])) {
                   partNo = partMatch[0];
               }
          }
          if (!partNo) {
               const colonMatch = remainingText.match(/([A-Z0-9\-]{5,12}):/);
               if (colonMatch) partNo = colonMatch[1];
          }
          if (partNo.endsWith("-")) partNo = partNo.slice(0, -1);
          if (!partNo) partNo = `ITEM-${i+1}`;

          let desc = cleanDescription(remainingText);
          if (partNo && partNo !== `ITEM-${i+1}` && desc.includes(partNo)) {
              const parts = desc.split(partNo);
              if (parts.length > 1) desc = parts.slice(1).join(" ");
          }
          
          desc = desc.replace(/^[:\s-]+/g, "").replace(/\s+/g, " ").trim();
          if (!desc) desc = "CAT COMPONENT";

          items.push({ qty, partNo, desc, weight, unitPrice, availability });
      }
      return items;
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

        let headerIdx = -1;
        const colMap = { qty: -1, part: -1, desc: -1, price: -1, weight: -1, avail: -1 };
        const terms = {
            part: ['part', 'number', 'item', 'sku', 'pn', 'material'],
            desc: ['description', 'desc', 'product', 'name', 'details'],
            qty: ['qty', 'quantity', 'count', 'pcs'],
            price: ['price', 'unit', 'cost', 'rate', 'ea'],
            weight: ['weight', 'wt', 'lbs', 'kg'],
            avail: ['avail', 'stock', 'status', 'due']
        };

        const normalize = (s: any) => String(s).toLowerCase().replace(/[^a-z]/g, '');

        for (let i = 0; i < Math.min(rows.length, 25); i++) {
            const row = rows[i];
            let matches = 0;
            const cells = row.map(normalize);
            if (cells.some(c => terms.part.some(t => c.includes(t)))) matches++;
            if (cells.some(c => terms.price.some(t => c.includes(t)))) matches++;
            if (matches >= 2) {
                headerIdx = i;
                row.forEach((cellRaw: any, idx: number) => {
                    const cell = normalize(cellRaw);
                    if (terms.qty.some(t => cell.includes(t))) colMap.qty = idx;
                    else if (terms.price.some(t => cell.includes(t)) && !cell.includes('total')) colMap.price = idx;
                    else if (terms.part.some(t => cell.includes(t))) colMap.part = idx;
                    else if (terms.desc.some(t => cell.includes(t))) colMap.desc = idx;
                    else if (terms.weight.some(t => cell.includes(t))) colMap.weight = idx;
                    else if (terms.avail.some(t => cell.includes(t))) colMap.avail = idx;
                });
                break;
            }
        }

        const items: QuoteItem[] = [];
        const startRow = headerIdx === -1 ? 0 : headerIdx + 1;

        for (let i = startRow; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            const getVal = (idx: number) => (idx > -1 && row[idx] !== undefined) ? row[idx] : null;

            let qty = 1;
            const rawQty = getVal(colMap.qty);
            if (rawQty !== null) {
                const q = parseInt(String(rawQty).replace(/[^0-9]/g, ''));
                if (q > 0) qty = q;
            }

            let unitPrice = 0;
            const rawPrice = getVal(colMap.price);
            if (rawPrice !== null) {
                if (typeof rawPrice === 'number') unitPrice = rawPrice;
                else {
                    const p = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
                    if (!isNaN(p)) unitPrice = p;
                }
            }

            let partNo = "CAT-PART";
            const rawPart = getVal(colMap.part);
            if (rawPart) partNo = String(rawPart).trim();

            let desc = "CAT COMPONENT";
            const rawDesc = getVal(colMap.desc);
            if (rawDesc) desc = cleanDescription(String(rawDesc));

            let weight = 0;
            const rawWeight = getVal(colMap.weight);
            if (rawWeight) weight = extractWeight(String(rawWeight));
            
            let availability = "";
            const rawAvail = getVal(colMap.avail);
            if (rawAvail) availability = String(rawAvail).trim();

            if (unitPrice > 0) {
                items.push({ qty, partNo, desc, weight, unitPrice, availability });
            }
        }
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
  
  let allRowObjects: { text: string, images: string[] }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const pageImages: { y: number, base64: string }[] = [];
    
    try {
        const ops = await page.getOperatorList();
        const commonObjs = page.commonObjs;
        const objs = page.objs;
        let currentMatrix = [1, 0, 0, 1, 0, 0];
        const matrixStack: number[][] = [];

        for (let j = 0; j < ops.fnArray.length; j++) {
            const fn = ops.fnArray[j];
            const args = ops.argsArray[j];
            if (fn === window.pdfjsLib.OPS.save) matrixStack.push([...currentMatrix]);
            else if (fn === window.pdfjsLib.OPS.restore) { if (matrixStack.length > 0) currentMatrix = matrixStack.pop()!; }
            else if (fn === window.pdfjsLib.OPS.transform) currentMatrix = multiplyMatrix(currentMatrix, args);
            else if (fn === window.pdfjsLib.OPS.paintImageXObject) {
                const imgName = args[0];
                try {
                    let imgObj = await objs.get(imgName).catch(() => null);
                    if (!imgObj && commonObjs) imgObj = await commonObjs.get(imgName).catch(() => null);
                    if (imgObj && (imgObj.data || imgObj.bitmap)) {
                        const canvas = document.createElement('canvas');
                        canvas.width = imgObj.width;
                        canvas.height = imgObj.height;
                        const ctx = canvas.getContext('2d');
                        if (imgObj.bitmap) ctx?.drawImage(imgObj.bitmap, 0, 0);
                        else if (imgObj.data) {
                             const array = new Uint8ClampedArray(imgObj.data);
                             const imgData = new ImageData(array, imgObj.width, imgObj.height);
                             ctx?.putImageData(imgData, 0, 0);
                        }
                        if (canvas.width > 0 && canvas.height > 0) {
                            pageImages.push({ y: currentMatrix[5], base64: canvas.toDataURL('image/jpeg', 0.8) });
                        }
                    }
                } catch (err) {}
            }
        }
    } catch (e) {}
    
    const content = await page.getTextContent();
    const items = content.items
      .map((item: any) => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width || 0,
        height: item.height || 10
      }))
      .filter((item: any) => item.str.trim().length > 0);

    items.sort((a: any, b: any) => b.y - a.y);

    const rows: any[][] = [];
    if (items.length > 0) {
        let currentRow = [items[0]];
        for (let j = 1; j < items.length; j++) {
            const item = items[j];
            const prevItem = currentRow[0];
            if (Math.abs(item.y - prevItem.y) < (prevItem.height * 0.6)) currentRow.push(item);
            else { rows.push(currentRow); currentRow = [item]; }
        }
        rows.push(currentRow);
    }

    const pageRows = rows.map(row => {
        row.sort((a, b) => a.x - b.x);
        const text = row.map(r => r.str).join(" ").trim();
        const rowY = row[0].y; 
        const linkedImages = pageImages.filter(img => Math.abs(img.y - rowY) < 60).map(img => img.base64);
        return { text, images: linkedImages };
    });

    allRowObjects = [...allRowObjects, ...pageRows];
  }
  
  const parsedItems: QuoteItem[] = [];
  let currentItem: Partial<QuoteItem> & { rawText: string, attachedImages: string[] } | null = null;
  const startPattern = /^(?:(\d+)\)\s+\d+|(?:[0-9A-Z]{2,5}-[0-9A-Z]{3,7})|(?:[0-9]{6,8}))\b/i;

  const finalizeItem = (item: any) => {
     if (!item) return;
     let qty = 1;
     const lineQty = item.rawText.match(/^\d+\)\s+(\d+)/);
     const pMatchStart = item.rawText.match(/(?:\b[0-9A-Z]{1,5}-[0-9A-Z]{3,7}\b|\b[0-9]{5,8}\b)/i);
     if (lineQty) qty = parseInt(lineQty[1]);
     else if (pMatchStart) {
         const pNoStr = pMatchStart[0];
         const escP = pNoStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
         const qm = item.rawText.match(new RegExp(`(\\d+)\\s+(?=${escP})`, 'i'));
         if (qm) qty = parseInt(qm[1]);
     }
     let uPrice = determineCorrectPrice(item.rawText, qty);
     if (uPrice === 0) return; 

     const weight = extractWeight(item.rawText);
     const { availability, remainingText } = extractAvailability(item.rawText);

     let pNo = "";
     const pMatch = remainingText.match(/(?:\b[0-9A-Z]{1,5}-[0-9A-Z]{3,7}\b|\b[0-9]{5,8}\b)/i);
     if (pMatch && !/^\d{1,4}$/.test(pMatch[0])) pNo = pMatch[0];
     if (!pNo) pNo = "ITEM";

     let desc = cleanDescription(remainingText);
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
         unitPrice: uPrice,
         originalImages: item.attachedImages || [],
         availability
     });
  };

  let inItemSection = false;
  for (const rowObj of allRowObjects) {
      const rowText = rowObj.text;
      if (!rowText) continue;
      if (rowText.match(/Items In Your Order/i)) { inItemSection = true; continue; }
      if (rowText.match(/Summary of Charges|Order Total|Subtotal/i)) inItemSection = false;
      if (rowText.match(/^Page \d/i) || rowText.match(/Invoice|Ship To|Bill To|Sold To|P\.O\.|Date:|Terms:|Due Date/i)) continue;

      const isStartPattern = startPattern.test(rowText);
      if (!inItemSection && isStartPattern && rowText.match(/^\d+\)\s+\d+/)) inItemSection = true;

      if (inItemSection && isStartPattern) {
          if (currentItem) finalizeItem(currentItem);
          currentItem = { rawText: rowText, attachedImages: rowObj.images };
      } else if (inItemSection || currentItem) {
          if (currentItem) {
              if (/[a-zA-Z0-9]/.test(rowText)) {
                  currentItem.rawText += " " + rowText;
                  if (rowObj.images.length > 0) {
                      const newImages = rowObj.images.filter(img => !currentItem!.attachedImages.includes(img));
                      currentItem.attachedImages = [...currentItem.attachedImages, ...newImages];
                  }
              }
          }
      }
  }
  if (currentItem) finalizeItem(currentItem);
  return parsedItems.length > 0 ? parsedItems : await parseDocumentWithAI(allRowObjects.map(r => r.text).join("\n"));
};
