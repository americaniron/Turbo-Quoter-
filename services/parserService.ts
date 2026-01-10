
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
 * Clean string to remove generic labels and ensure only item details remain.
 */
function cleanDescription(text: string): string {
  if (!text) return "CAT COMPONENT";
  
  let cleaned = String(text)
    // Remove Company/Contact Info
    .replace(/Ring Power|RING POWER CORPORATION|Tampa|Riverview|Fern Hill|025069|ADAM qadah|adam@americanyellowiron\.com/gi, "")
    .replace(/10421 Fern Hill Dr\.|813-671-3700|33578|United States|Florida/gi, "")
    // Remove Page Sections & Summary Headers
    .replace(/Order Information|Pickup Location|Pickup Method|SUMMARY OF CHARGES|Items In Your Order|Page \d+ of \d+/gi, "")
    // Remove Table Headers
    .replace(/\b(Unit Price|Extended Price|Total Price|Product Description|Line Item|Availability|Notes|Quantity)\b/gi, "")
    // Remove Summary Labels aggressively
    .replace(/ORDER SUBTOTAL|Shipping\/Miscellaneous|Total Tax|ORDER TOTAL|Contact Dealer/gi, "")
    .replace(/\(USD\)/g, "")
    // Remove specific part-row boilerplate
    .replace(/Non-returnable part/gi, "")
    .replace(/Line item note:/gi, "")
    .replace(/Replaces Part # \(.+?\)/gi, "")
    // Remove trailing/orphaned prices
    .replace(/[\$]?[0-9,]+\.[0-9]{2}\s+(?:ea\.?|USD)/gi, "")
    .replace(/[\$]?[0-9,]+\.[0-9]{2}/g, "")
    // Clean up characters
    .replace(/[:]/g, " ")
    .trim();

  // Remove leading item numbers like "1) 1"
  cleaned = cleaned.replace(/^(?:\d+[\s)]+)+/, "");
  // Remove leading whitespace/dashes
  cleaned = cleaned.replace(/^[\s-]+/, "");
  
  // Final check to see if the description contains a summary label accidentally
  if (cleaned.match(/ORDER TOTAL|SUBTOTAL|TAX/i)) {
      cleaned = cleaned.split(/ORDER TOTAL|SUBTOTAL|TAX/i)[0];
  }
  
  return cleaned.replace(/\s{2,}/g, " ").trim() || "CAT COMPONENT";
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

function determineCorrectPrice(text: string, qty: number): number {
    const matches = [...text.matchAll(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g)];
    let prices = matches.map(m => parseFloat(m[1].replace(/,/g, "")));
    prices = prices.filter(p => p > 0.01);
    
    if (prices.length === 0) return 0;

    const eaMatch = text.match(/\$?([0-9,]+\.[0-9]{2})\s+ea\.?/i);
    if (eaMatch) {
        return parseFloat(eaMatch[1].replace(/,/g, ""));
    }

    if (qty > 1) {
        for (let p1 of prices) {
            for (let p2 of prices) {
                if (p1 === p2) continue;
                if (Math.abs(p1 * qty - p2) < 0.1) return p1;
                if (Math.abs(p2 * qty - p1) < 0.1) return p2;
            }
        }
        return Math.min(...prices);
    }

    return prices[0];
}

function multiplyMatrix(m1: number[], m2: number[]): number[] {
    return [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3] * m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[3] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
    ];
}

export const parseTextData = (text: string): QuoteItem[] => {
    const lines = text.split('\n');
    const items: QuoteItem[] = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const m = trimmed.match(/^(\d+)\s+([A-Z0-9-]+)\s+(.+?)\s+\$?([0-9,]+\.[0-9]{2})/i);
        if (m) {
            items.push({
                qty: parseInt(m[1]),
                partNo: m[2],
                desc: cleanDescription(m[3]),
                weight: extractWeight(trimmed),
                unitPrice: parseFloat(m[4].replace(/,/g, '')),
                availability: extractAvailability(trimmed).availability
            });
        }
    }
    return items;
};

export const parseExcelFile = async (file: File): Promise<QuoteItem[]> => {
    const data = await file.arrayBuffer();
    const workbook = window.XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = window.XLSX.utils.sheet_to_json(worksheet);
    return jsonData.map((row: any) => ({
        qty: Number(row.qty || row.Quantity || 1),
        partNo: String(row.partNo || row.Part || row.Item || ""),
        desc: cleanDescription(String(row.desc || row.Description || "Part Description")),
        weight: Number(row.weight || row.Weight || 0),
        unitPrice: Number(row.unitPrice || row.Price || 0),
        availability: String(row.availability || "")
    })).filter(item => item.partNo);
};

export const parsePdfFile = async (file: File): Promise<QuoteItem[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let allRows: { text: string, images: string[], y: number, page: number }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const pageImages: { y: number, x: number, base64: string, w: number, h: number }[] = [];
    try {
        const ops = await page.getOperatorList();
        const objs = page.objs;
        const commonObjs = page.commonObjs;
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
                let imgObj = await objs.get(imgName).catch(() => null);
                if (!imgObj && commonObjs) imgObj = await commonObjs.get(imgName).catch(() => null);
                if (imgObj && imgObj.width > 25) {
                    const canvas = document.createElement('canvas');
                    canvas.width = imgObj.width;
                    canvas.height = imgObj.height;
                    const ctx = canvas.getContext('2d');
                    if (imgObj.bitmap) ctx?.drawImage(imgObj.bitmap, 0, 0);
                    else if (imgObj.data) {
                        const imgData = new ImageData(new Uint8ClampedArray(imgObj.data), imgObj.width, imgObj.height);
                        ctx?.putImageData(imgData, 0, 0);
                    }
                    if (currentMatrix[4] > 40 && currentMatrix[4] < 550) {
                        pageImages.push({ y: currentMatrix[5], x: currentMatrix[4], base64: canvas.toDataURL('image/jpeg', 0.8), w: imgObj.width, h: imgObj.height });
                    }
                }
            }
        }
    } catch (e) {}
    
    const content = await page.getTextContent();
    const textItems = content.items.map((item: any) => ({ str: item.str, x: item.transform[4], y: item.transform[5] }));
    textItems.sort((a, b) => b.y - a.y);
    const rowGroups: any[][] = [];
    if (textItems.length > 0) {
        let cur = [textItems[0]];
        for (let j = 1; j < textItems.length; j++) {
            if (Math.abs(textItems[j].y - cur[0].y) < 8) cur.push(textItems[j]);
            else { rowGroups.push(cur); cur = [textItems[j]]; }
        }
        rowGroups.push(cur);
    }
    const pageRows = rowGroups.map(group => {
        group.sort((a, b) => a.x - b.x);
        const y = group[0].y;
        const text = group.map(g => g.str).join(" ").trim();
        const linked = pageImages.filter(img => Math.abs(img.y - y) < 45).sort((a, b) => a.x - b.x).map(img => img.base64);
        return { text, images: linked, y, page: i };
    });
    allRows = [...allRows, ...pageRows];
  }
  
  const items: QuoteItem[] = [];
  let curItem: { text: string, imgs: string[] } | null = null;
  let inItemSection = false;

  for (const row of allRows) {
      const cleanRow = row.text.trim();
      if (!cleanRow) continue;

      if (cleanRow.match(/Items In Your Order/i)) {
          inItemSection = true;
          continue;
      }
      
      if (cleanRow.match(/SUMMARY OF CHARGES|ORDER SUBTOTAL|Shipping\/Miscellaneous|Total Tax|ORDER TOTAL|Page \d+ of \d+/i)) {
          if (curItem) {
              const flushed = flushItem(curItem);
              if (flushed) items.push(flushed);
              curItem = null;
          }
          inItemSection = false;
          continue;
      }

      if (inItemSection) {
          const itemMatch = cleanRow.match(/^(\d+\)\s+)?(\d+)\s+([A-Z0-9-]+)\b/i);
          if (itemMatch) {
              if (curItem) {
                  const flushed = flushItem(curItem);
                  if (flushed) items.push(flushed);
              }
              curItem = { text: cleanRow, imgs: row.images };
          } else if (curItem) {
              // Extra safety: stop appending if current line looks like summary footer
              if (cleanRow.match(/ORDER SUBTOTAL|Shipping\/Miscellaneous|Total Tax|ORDER TOTAL/gi)) {
                   if (curItem) {
                      const flushed = flushItem(curItem);
                      if (flushed) items.push(flushed);
                      curItem = null;
                   }
                   inItemSection = false;
                   continue;
              }
              curItem.text += " " + cleanRow;
              curItem.imgs = [...curItem.imgs, ...row.images];
          }
      }
  }

  if (curItem) {
      const flushed = flushItem(curItem);
      if (flushed) items.push(flushed);
  }

  return items;
};

function flushItem(curItem: { text: string, imgs: string[] }): QuoteItem | null {
    const m = curItem.text.match(/^(\d+\)\s+)?(\d+)\s+([A-Z0-9-]+)\b/i);
    if (!m) return null;
    
    const qty = parseInt(m[2]);
    const partNo = m[3];
    const { availability, remainingText } = extractAvailability(curItem.text);
    const price = determineCorrectPrice(remainingText, qty);
    
    return {
        qty,
        partNo,
        desc: cleanDescription(remainingText),
        weight: extractWeight(remainingText),
        unitPrice: price,
        availability,
        originalImages: curItem.imgs
    };
}
