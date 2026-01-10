
import { GoogleGenAI, Type } from "@google/genai";
import { QuoteItem } from "../types.ts";

/**
 * AI Brainstorming/Analysis using Gemini 3 Pro for complex reasoning.
 * Optimized prompt for engineering logic.
 */
export const analyzeQuoteData = async (items: QuoteItem[]): Promise<string> => {
  // Always create a new instance right before the call to ensure the latest API Key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  if (!process.env.API_KEY) return "Configuration Error: Missing API Credentials";

  try {
    const context = items.map(i => `${i.qty}x ${i.partNo} (${i.desc})`).join(", ");
    const prompt = `
        You are a senior heavy machinery logistics engineer at American Iron.
        Analyze this machinery parts list: ${context}.
        TASK:
        1. Identify the primary machine system being repaired.
        2. Identify any CRITICAL MISSING COMPONENTS (e.g. if filters are ordered but seals are missing).
        3. Provide 1 proactive maintenance recommendation.
        
        OUTPUT: Provide a cohesive, authoritative 2-3 sentence engineering brief. 
        IMPORTANT: No bullet points. No conversational filler. Just the technical diagnostics.
    `.replace(/\s+/g, ' ').trim();

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        // Gemini 3 Pro is a reasoning-first model. Setting a thinkingBudget of 0 is invalid.
        // We provide a reasonable budget (1024 tokens) to allow for technical synthesis.
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    return response.text || "Diagnostic analysis yielded no specific concerns.";
  } catch (error) {
    console.error("Analysis Error:", error);
    if (error.message?.includes("entity was not found")) {
        return "Requested entity was not found. Please verify your project billing and key selection.";
    }
    return "The engineering hub is currently offline. Please check your network connection.";
  }
};

/**
 * Generates an exact part photo using Imagen 4.0.
 */
export const generatePartImage = async (partNo: string, description: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  if (!process.env.API_KEY) return null;

  const cleanDesc = description.replace(/CAT COMPONENT|CAT PART|ASSEMBLY/gi, '').trim();
  const prompt = `Highly detailed industrial product catalog photograph of Caterpillar heavy machinery part ${partNo}. ${cleanDesc}. Isolated on pure white background, studio lighting, professional 8k resolution.`;

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
    return b64 ? `data:image/jpeg;base64,${b64}` : null;
  } catch (error) {
    // Fallback to Gemini 3 Pro Image generation if Imagen fails
    try {
        const genResponse = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: { parts: [{ text: prompt }] },
          config: { imageConfig: { aspectRatio: "1:1" } }
        });
        for (const part of genResponse.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    } catch (e) {}
    return null;
  }
};

/**
 * Parses unstructured text into structured QuoteItems using Gemini 3 Flash.
 */
export const parseDocumentWithAI = async (text: string): Promise<QuoteItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  if (!process.env.API_KEY) return [];

  try {
    const prompt = `Extract tabular line item data from: """${text.substring(0, 15000)}"""`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    const parsed = JSON.parse(response.text || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};
