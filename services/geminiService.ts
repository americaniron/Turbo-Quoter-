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
const REQUEST_DELAY_MS = 2000;

/**
 * Generates an exact part photo using Imagen 4.0, falling back to Gemini 2.5 Flash.
 */
export const generatePartImage = async (partNo: string, description: string): Promise<string | null> => {
  // Chain this request to the end of the queue
  const queueItem = requestQueue.then(async () => {
    const ai = getAiClient();
    if (!ai) return null;

    // Wait before executing to throttle
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
    
    const prompt = `Industrial component reference photo of ${partNo} ${description}. Engineering style, white background, metallic textures, studio lighting.`;

    // Attempt 1: Imagen 4.0 (High Quality)
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

    // Attempt 2: Gemini 2.5 Flash Image (Fallback)
    try {
      const fallbackPrompt = `Generate a realistic image of industrial part ${partNo} - ${description}. Isolated on white background.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: fallbackPrompt }]
        },
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
  if (!ai) return "AI Configuration Error: Missing API Key";

  try {
    const prompt = `Analyze this parts list for a heavy machinery repair job: ${JSON.stringify(items)}. 
    1. What is the likely repair goal? 
    2. Suggest 2 missing items that are commonly associated with these parts. 
    Keep it under 50 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Analysis unavailable.";
  } catch (error) {
    console.error("Analysis Error:", error);
    return "AI Analysis service temporarily unavailable.";
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
    Extract line items from the following document text.
    Return a JSON array of objects with these properties:
    - qty (number, default 1)
    - partNo (string, try to find the Part Number or SKU)
    - desc (string, description of the item)
    - weight (number, in LBS. If unit is KG, convert to LBS. If missing, use 0)
    - unitPrice (number, remove currency symbols)
    
    Ignore pages headers, footers, and summary totals. Focus on the line items.
    
    Document Text:
    ${text.substring(0, 30000)} 
    `; 
    // Truncate to avoid token limits if PDF is huge, though Flash context is large.

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