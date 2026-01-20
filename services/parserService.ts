import { QuoteItem } from '../types.ts';

// --- Helper Functions ---

/**
 * Clean string to remove generic labels and all third-party vendor info.
 * Extremely aggressive to ensure strictly American Iron LLC branding.
 */
function cleanDescription(text: string): string {
  if (!text) return "";

  let cleaned = String(text)
    // Remove specific URL artifacts
    .replace(/\/\/parts\.cat\.com\/[^\s]*/gi, '')
    .replace(/\/\/www\.costex\.com\/[^\s]*/gi, '')
    .replace(/https?:\/\/[^\s]+/gi, '')
    // Remove Third Party Vendor Names & Identifiers
    .replace(/Ring Power|RING POWER CORPORATION|Industrial Parts Depot|IPD|COSTEX TRACTOR PARTS|COSTEX|CTP|Industrial Parts Depot, LLC|CAT/gi, "")
    // Remove Addresses & Location Info from provided samples
    .replace(/Tampa|Riverview|Fern Hill|025069|ADAM qadah|americanyellowiron\.com/gi, "")
    .replace(/10421 Fern Hill Dr\.|813-671-3700|33578|United States|Florida|Cat Vantage Rewards|adam@/gi, "")
    .replace(/5800 NW 74TH AVENU|Miami, FL - 33166|1441 S\. Beltline Rd|Coppell, TX 75019|dallas-sales@costex\.com/gi, "")
    .replace(/\(305\) 592-9769|\(214\) 231-7455/gi, "")
    .replace(/Miami|Dallas|Coppell|Carson CA 90746/gi, "")
    // Remove Common Table Headers and UI Labels
    .replace(/Order Information|Order Summary|View Order|Ship To|Bill To|Payment Method|Tracking Number|Add to Cart|Pickup Location|Pickup Method|SUMMARY OF CHARGES|Items In Your Order|Page \d+ of \d+/gi, "")
    .replace(/\b(Unit Price|Extended Price|Total Price|Product Description|Line Item|Availability|Notes|Quantity|Part Number|Description|Inventory Status|LC|Qty Order|Qty Available|O\.E\.M\. Price|Net Price|Line Total|Item)\b/gi, "")
    .replace(/ORDER SUBTOTAL|Shipping\/Miscellaneous|Total Tax|ORDER TOTAL|Contact Dealer|SUBTOTAL|TAX|TOTAL APROXIMATE WEIGHT|ESTIMATED FREIGHT|OTHER CHARGES|TOTAL\.\.\.\.\.\.\.\.\.\.\.\.\.\./gi, "")
    .replace(/\(USD\)/g, "")
    // Remove specific row boilerplate
    .replace(/Core Charge Included|Remanufactured part|In Stock|Backorder|Out of Stock|Lead Time/gi, "")
    // Remove currency patterns and units
    .replace(/[\$]?[0-9,]+\.[0-9]{2}\s+(?:ea\.?|USD)/gi, "")
    .replace(/[\$]?[0-9,]+\.[0-9]{2}/g, "")
    // Final character cleanup
    .replace(/[:|]/g, " ")
    .trim();

  // Remove leading row indexes (e.g. "1) ", "0001 ")
  cleaned = cleaned.replace(/^(?:\d+[\s)\.]*)+/, "");
  cleaned = cleaned.replace(/^[\s\-_>]+/, "");

  return cleaned.replace(/\s{2,}/g, " ").trim();
}

/**
 * Extracts availability info from a line of text.
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

function extractWeight(text: string): number {
  const m = String(text).match(/(\d+(?:\.\d+)?)\s*(lb|lbs|1bs|kg|kgs|kilogram|k\.g\.)\b/i);
  if (!m) return 0;
  const val = parseFloat(m[1]);
  const unit = (m[2] || "").toLowerCase();
  return (unit.includes("kg") || unit.includes("kilogram") || unit.includes("k.g")) ? val * 2.20462 : val;
}

function isDateString(str: string): boolean {
  return /^\d{1,2}[-\/]\d{2,4}$/.test(str) || /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/.test(str);
}

// --- Specific Vendor Parsers ---

function parseRingPowerPage(textLines: {y: number, text: string}[]): { items: QuoteItem[], yCoords: number[] } {
  const items: QuoteItem[] = [];
  const yCoords: number[] = [];
  const itemStartRegex = /^\s*(\d+)[\)\.]\s+(\d+)\s+([A-Z0-9\-\.:\/]+)(.*)$/i;
  let currentItem: QuoteItem | null = null;
  let currentY = 0;

  for (const lineObj of textLines) {
    const text = lineObj.text;
    if (text.match(/SUMMARY OF CHARGES|ORDER TOTAL|SUBTOTAL|TAX|RING POWER/i)) {
      if (currentItem) { items.push(currentItem); yCoords.push(currentY); currentItem = null; }
      continue;
    }

    const startMatch = text.match(itemStartRegex);
    if (startMatch && !isDateString(startMatch[3])) {
      if (currentItem) { items.push(currentItem); yCoords.push(currentY); }
      const qty = parseInt(startMatch[2]);
      const rawPart = startMatch[3].replace(/:$/, '');
      const priceMatch = text.match(/\$([0-9,]+\.[0-9]{2})/);
      const unitPrice = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) / qty : 0;

      currentItem = {
        lineNo: startMatch[1],
        qty,
        partNo: rawPart,
        desc: cleanDescription(startMatch[4]),
        weight: extractWeight(text),
        unitPrice,
        availability: extractAvailability(text).availability,
        originalImages: []
      };
      currentY = lineObj.y;
    } else if (currentItem) {
      if (Math.abs(currentY - lineObj.y) > 300) { items.push(currentItem); yCoords.push(currentY); currentItem = null; continue; }
      currentItem.desc += " " + cleanDescription(text);
      if (currentItem.weight === 0) currentItem.weight = extractWeight(text);
    }
  }
  if (currentItem) { items.push(currentItem); yCoords.push(currentY); }
  return { items, yCoords };
}

function parseCostexPage(textLines: {y: number, text: string}[]): { items: QuoteItem[], yCoords: number[] } {
  const items: QuoteItem[] = [];
  const yCoords: number[] = [];
  const itemRegex = /^\s*(\d{4})\s+(\S+)\s+(.+?)\s+(\d+\.\d+)\s+(.*?)\s+(\d+)\s+(\d+)\s+([\d,\.]+)\s+([\d,\.]+)\s+([\d,\.]+)$/i;

  for (const lineObj of textLines) {
    const text = lineObj.text;
    const match = text.match(itemRegex);
    if (match) {
      const qty = parseInt(match[6]);
      const netPrice = parseFloat(match[9].replace(/,/g, ''));
      items.push({
        lineNo: match[1],
        qty,
        partNo: match[2],
        desc: cleanDescription(match[3]),
        weight: parseFloat(match[4]),
        unitPrice: netPrice,
        availability: match[5].trim(),
        originalImages: []
      });
      yCoords.push(lineObj.y);
    }
  }
  return { items, yCoords };
}

// --- Main Entry Points ---

export const parseTextData = (text: string): QuoteItem[] => {
  const lines = text.split('\n').map((l, i) => ({ y: i * 10, text: l }));
  return parseRingPowerPage(lines).items;
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
  if (!window.pdfjsLib) throw new Error("PDF Engine not loaded.");
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullItems: QuoteItem[] = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const linesMap = new Map<number, any[]>();
    
    textContent.items.forEach((item: any) => {
      const y = Math.round(item.transform[5]);
      let matchY: number | undefined;
      for (const key of linesMap.keys()) { if (Math.abs(key - y) <= 4) { matchY = key; break; } }
      if (matchY === undefined) { matchY = y; linesMap.set(matchY, []); }
      linesMap.get(matchY)!.push(item);
    });

    const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
    const textLines = sortedY.map(y => ({
      y,
      text: linesMap.get(y)!.sort((a, b) => a.transform[4] - b.transform[4]).map(it => it.str).join(' ').trim()
    })).filter(l => l.text.length > 0);

    const pageText = textLines.map(l => l.text).join(' ');
    const isCostex = pageText.includes("COSTEX") || pageText.includes("CTP");
    const { items: pageItems, yCoords } = isCostex ? parseCostexPage(textLines) : parseRingPowerPage(textLines);

    // Image extraction
    const opList = await page.getOperatorList();
    const images: { y: number, dataUrl: string }[] = [];
    
    for (let j = 0; j < opList.fnArray.length; j++) {
      if (opList.fnArray[j] === window.pdfjsLib.OPS.paintImageXObject) {
        const imgKey = opList.argsArray[j][0];
        const currentTransform = opList.argsArray[j-1];
        if (currentTransform && currentTransform.length === 6) {
          try {
            const imgData = await page.objs.get(imgKey);
            if (imgData && imgData.data) {
              const canvas = document.createElement("canvas");
              canvas.width = imgData.width;
              canvas.height = imgData.height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                const imageData = ctx.createImageData(imgData.width, imgData.height);
                const data = imgData.data;
                const pixels = imageData.data;
                
                // Handling different PDF pixel formats (RGB vs RGBA vs Gray)
                if (data.length === imgData.width * imgData.height * 3) {
                  for (let p = 0, q = 0; p < data.length; p += 3, q += 4) {
                    pixels[q] = data[p];
                    pixels[q+1] = data[p+1];
                    pixels[q+2] = data[p+2];
                    pixels[q+3] = 255;
                  }
                } else if (data.length === imgData.width * imgData.height * 4) {
                   pixels.set(data);
                } else if (data.length === imgData.width * imgData.height) {
                   for (let p = 0, q = 0; p < data.length; p++, q += 4) {
                    pixels[q] = pixels[q+1] = pixels[q+2] = data[p];
                    pixels[q+3] = 255;
                  }
                }
                
                ctx.putImageData(imageData, 0, 0);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                images.push({ y: currentTransform[5], dataUrl });
              }
            }
          } catch (e) {}
        }
      }
    }

    // Association logic based on vertical alignment
    pageItems.forEach((item, idx) => {
      const itemY = yCoords[idx];
      let bestImg = null;
      let minDiff = Infinity;
      images.forEach(img => {
        const diff = Math.abs(img.y - itemY);
        if (diff < minDiff && diff < 100) { 
          minDiff = diff; 
          bestImg = img.dataUrl; 
        }
      });
      if (bestImg) item.originalImages = [bestImg];
    });

    fullItems.push(...pageItems);
  }

  return fullItems;
};
