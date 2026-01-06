import { GoogleGenAI, Type } from "@google/genai";
import { QuoteItem } from "../types.ts";

// Singleton instance holder
let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
    
    if (apiKey) {
      aiClient = new GoogleGenAI({ apiKey });
    } else {
      console.warn("API_KEY not found in process.env or window.process.env");
    }
  }
  return aiClient;
};

// Rate Limiting Queue Mechanism
let requestQueue = Promise.resolve();
const REQUEST_DELAY_MS = 1500; // Slightly reduced delay for better UX

/**
 * Generates an exact part photo using Imagen 4.0, falling back to Gemini 3 Pro Image.
 */
export const generatePartImage = async (partNo: string, description: string): Promise<string | null> => {
  // Chain this request to the end of the queue
  const queueItem = requestQueue.then(async () => {
    const ai = getAiClient();
    if (!ai) return null;

    // Wait before executing to throttle
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
    
    // Clean description to remove generic placeholders
    const cleanDesc = description.replace(/CAT COMPONENT|CAT PART|ASSEMBLY/gi, '').trim();
    
    // STRICT "EXACT PART" PROMPT
    const prompt = `
      Create a strictly accurate, photorealistic catalog product image for Caterpillar Part Number: ${partNo}.
      Item Description: ${cleanDesc}.

      Directives:
      1. EXACT MATCH: Use deep technical knowledge of Part Number "${partNo}" to determine the specific shape, form factor, and material.
      2. MATERIAL REALISM: 
         - If the part is a Seal/O-Ring/Gasket -> Render as black rubber or polymer.
         - If the part is a Filter -> Render as a canister (White/Yellow) or element.
         - If the part is Hardware (Bolt/Nut) -> Render as Zinc-plated or steel.
         - Only use "Caterpillar Yellow" paint if it is a large structural casting or housing.
      3. CONDITION: Brand New, Factory Clean. Do NOT add grease, rust, weathering, or artistic "grime".
      4. COMPOSITION: Isolated object, Pure White Background (#FFFFFF), Studio Lighting, Isometric View.
      5. Do not generate a generic engine block unless the part number specifically refers to one.
    `.replace(/\s+/g, ' ').trim();

    // Attempt 1: Imagen 4.0 (High Quality Generation)
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                aspectRatio: '1:1',
                outputMimeType: 'image/jpeg'
            }
        });

        const b64 = response.generatedImages?.[0]?.image?.imageBytes;
        if (b64) {
            return `data:image/jpeg;base64,${b64}`;
        }
    } catch (error: any) {
        // Silently fail to fallback
        console.warn(`Imagen 4 gen failed for ${partNo}, trying fallback.`, error.message);
    }

    // Attempt 2: Gemini 3 Pro Image (High Fidelity Fallback)
    try {
      // Fallback needs to be equally strict
      const fallbackPrompt = `
        Generate a photorealistic white-background catalog image of this specific spare part: ${partNo} (${cleanDesc}).
        Crucial: The image must be technically accurate to the part number. 
        If it is a small part (seal, bolt, sensor), show that specific small part, not a large machine.
        Style: Commercial Product Photography, Studio Lighting, Factory New.
      `.replace(/\s+/g, ' ').trim();
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: fallbackPrompt }]
        },
        config: {
            imageConfig: {
                aspectRatio: "1:1",
                imageSize: "1K"
            }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      
      return null;
    } catch (error: any) {
      if (error.status === 429 || String(error.message).includes('429')) {
         console.warn(`Rate Limit Exceeded for part ${partNo}`);
         return null;
      }
      console.error(`Image Gen Error for ${partNo}:`, error);
      return null;
    }
  });

  requestQueue = queueItem.catch(() => {}) as Promise<void>;
  return queueItem;
};

/**
 * AI Brainstorming/Analysis using Gemini 3 Flash.
 */
export const analyzeQuoteData = async (items: QuoteItem[]): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Configuration Error: Missing API Credentials";

  try {
    const prompt = `Analyze this parts list for a heavy machinery repair job: ${JSON.stringify(items)}. 
    1. Identify the repair system (e.g., Hydraulic, Undercarriage).
    2. EXPLICITLY identify missing components that should be added to the order (e.g., 'Missing seals', 'Add Filter Kit').
    3. Suggest one upsell item relevant to this repair.
    4. Summarize as a "Diagnostic Report" for a customer.
    Tone: Authoritative Engineering Advisor. Keep it under 60 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Analysis unavailable.";
  } catch (error) {
    console.error("Analysis Error:", error);
    return "Engineering analysis service temporarily unavailable.";
  }
};

/**
 * Parses unstructured text into structured QuoteItems using Gemini 2.5 Flash.
 * Used as a fallback for PDF parsing.
 */
export const parseDocumentWithAI = async (text: string): Promise<QuoteItem[]> => {
  const ai = getAiClient();
  if (!ai) {
    console.warn("AI Client unavailable for parsing");
    return [];
  }

  try {
    const prompt = `
    You are an expert Data Parsing Assistant. Your job is to extract tabular line item data from the provided document text (OCR output).
    
    The text may contain an Invoice, Quote, or Packing List.
    Identify the main table of items. 
    
    Data Cleanliness Rules:
    - **Description**: Include technical specs (e.g. Dimensions, Fits Model X, Kit Includes). Do not include weight or availability dates.
    - **Unit Price**: Identify the single unit price (often marked with 'ea'). Do not confuse it with the Total line price.
    
    Return a STRICT JSON array of objects. Each object must have:
    - qty: number (default 1)
    - partNo: string (Look for Part Number, SKU like 123-4567)
    - desc: string (Clean description)
    - weight: number (in LBS. If missing, use 0)
    - unitPrice: number (Price per item, no currency symbols)

    Document Text to Parse:
    """
    ${text.substring(0, 30000)}
    """
    `; 

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
             type: Type.OBJECT,
             properties: {
                qty: { type: Type.NUMBER },
                partNo: { type: Type.STRING },
                desc: { type: Type.STRING },
                weight: { type: Type.NUMBER },
                unitPrice: { type: Type.NUMBER }
             }
          }
        }
      }
    });

    const rawJSON = response.text;
    if (!rawJSON) return [];
    
    const parsed = JSON.parse(rawJSON);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("AI Parsing Error:", error);
    return [];
  }
};