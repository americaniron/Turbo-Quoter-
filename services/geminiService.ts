import { GoogleGenAI, Type } from "@google/genai";
import { QuoteItem, ClientInfo, AppConfig, EmailDraft } from "../types.ts";

/**
 * Safe retrieval of API Key from supported environments.
 */
const getApiKey = (): string | undefined => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_KEY) {
    return (import.meta as any).env.VITE_API_KEY;
  }
  return undefined;
};

/**
 * AI Brainstorming/Analysis using Gemini 3 Pro for complex reasoning.
 */
export const analyzeQuoteData = async (items: QuoteItem[]): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "AI services offline: API Key not configured.";

  const ai = new GoogleGenAI({ apiKey });

  try {
    const context = items.map((i, idx) => `Line ${(idx + 1).toString().padStart(2, '0')}: ${i.qty}x ${i.partNo} (${i.desc})`).join("\n");
    
    const prompt = `
        You are a senior heavy machinery logistics engineer at American Iron.
        Analyze this machinery parts list:
        ${context}
        
        TASK:
        1. Identify the primary machine system being repaired (e.g. Engine, Undercarriage, Hydraulic).
        2. Identify any CRITICAL MISSING COMPONENTS (e.g. if filters are ordered but seals or gaskets are missing). Refer to items by their Line Number.
        3. Provide 1 proactive maintenance recommendation.
        
        OUTPUT: Provide a cohesive, authoritative 2-3 sentence engineering brief. 
        IMPORTANT: No bullet points. No conversational filler. Just the technical diagnostics.
    `.replace(/\s+/g, ' ').trim();

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    return response.text || "Diagnostic analysis yielded no specific concerns.";
  } catch (error) {
    console.error("Analysis Error:", error);
    return "The engineering hub is currently offline.";
  }
};

/**
 * Generates an AI-synthesized email draft for the customer.
 */
export const generateEmailDraft = async (
  client: ClientInfo, 
  config: AppConfig, 
  items: QuoteItem[],
  tone: string = "professional"
): Promise<EmailDraft> => {
  const apiKey = getApiKey();
  const type = config.isInvoice ? "Invoice" : "Quotation";
  
  if (!apiKey) {
      return {
          to: client.email,
          subject: `American Iron: ${type} ${config.quoteId}`,
          body: `Hello ${client.contactName},\n\nPlease find the attached ${type} for your review.\n\nRegards,\nAmerican Iron Team`
        };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const itemsContext = items.map((i, idx) => `${(idx + 1).toString().padStart(2, '0')}. ${i.qty}x ${i.partNo}`).join(", ");

  const prompt = `
    You are an automated logistics dispatch agent for American Iron LLC (americaniron1.com).
    Generate a ${tone} email body for:
    - Customer: ${client.contactName} at ${client.company}
    - Document: ${type} #${config.quoteId}
    - Line Items [${items.length}]: ${itemsContext.substring(0, 500)}
    - Context: Parts ready for dispatch/review.
    
    CRITICAL INSTRUCTION: Ensure the email is strictly from "American Iron LLC". Do NOT mention any third party vendors like Ring Power or Caterpillar as the source.
    
    The email must mention that the ${type} is attached and they can contact us at americaniron1.com for any discrepancies.
    Include a clear call to action.
    Return only a JSON object matching this schema:
    { "to": "${client.email}", "subject": "American Iron Hub: ${type} ${config.quoteId} Dispatch Notice", "body": "..." }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            to: { type: Type.STRING },
            subject: { type: Type.STRING },
            body: { type: Type.STRING }
          },
          required: ["to", "subject", "body"]
        }
      }
    });
    
    return JSON.parse(response.text || "{}") as EmailDraft;
  } catch (error) {
    return {
      to: client.email,
      subject: `American Iron: ${type} ${config.quoteId}`,
      body: `Hello ${client.contactName},\n\nPlease find the attached ${type} for your review.\n\nRegards,\nAmerican Iron Team`
    };
  }
};

// --- Image Generation with Rate Limiting ---

const imageRequestQueue: {
    partNo: string;
    description: string;
    resolve: (value: string | null) => void;
    reject: (reason?: any) => void;
}[] = [];

let isProcessingQueue = false;
// Google's default is 20 req/min for gemini-pro-image. 60s / 20 = 3s/req. 3.5s is safer.
const REQUEST_INTERVAL = 3500; 

/**
 * The internal, unthrottled image generation function. This is the original implementation.
 */
const _internalGeneratePartImage = async (partNo: string, description: string): Promise<string | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const cleanDesc = description.replace(/CAT COMPONENT|CAT PART|ASSEMBLY/gi, '').trim();
  const prompt = `Highly detailed industrial product catalog photograph of Caterpillar heavy machinery part ${partNo}. ${cleanDesc}. Isolated on pure white background, studio lighting, professional 8k resolution.`;

  try {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        if (!(await (window as any).aistudio.hasSelectedApiKey())) {
            await (window as any).aistudio.openSelectKey();
        }
    }

    const ai = new GoogleGenAI({ apiKey });

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
    } catch (err) {
        const genResponse = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
        });
        
        for (const part of genResponse.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
  } catch (error) {
    console.error("Image generation hub error:", error);
    // Re-throw to allow the queue promise to be rejected, alerting the component.
    throw error;
  }
  return null;
};

/**
 * Processes the image generation queue with a delay between requests to avoid rate limiting.
 */
const processImageRequestQueue = async () => {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    while (imageRequestQueue.length > 0) {
        const request = imageRequestQueue.shift();
        if (request) {
            try {
                const imageUrl = await _internalGeneratePartImage(request.partNo, request.description);
                request.resolve(imageUrl);
            } catch (error) {
                request.reject(error);
            }
            // Wait for the specified interval before the next API call.
            await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL));
        }
    }

    isProcessingQueue = false;
};

/**
 * Public-facing function to queue an image generation request.
 * This prevents firing too many API calls at once and hitting rate limits.
 */
export const generatePartImage = (partNo: string, description: string): Promise<string | null> => {
    return new Promise((resolve, reject) => {
        imageRequestQueue.push({ partNo, description, resolve, reject });
        if (!isProcessingQueue) {
            processImageRequestQueue();
        }
    });
};
