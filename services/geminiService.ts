


import { GoogleGenAI, Type } from "@google/genai";
import { QuoteItem, ClientInfo, AppConfig, EmailDraft } from "../types.ts";

/**
 * AI Brainstorming/Analysis using Gemini 3 Pro for complex reasoning.
 */
export const analyzeQuoteData = async (items: QuoteItem[]): Promise<string> => {
  // Use process.env.API_KEY directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    // Accessing text as a property
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
  const type = config.isInvoice ? "Invoice" : "Quotation";
  
  // Use process.env.API_KEY directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
    
    // Accessing text as a property
    return JSON.parse(response.text || "{}") as EmailDraft;
  } catch (error) {
    return {
      to: client.email,
      subject: `American Iron: ${type} ${config.quoteId}`,
      body: `Hello ${client.contactName},\n\nPlease find the attached ${type} for your review.\n\nRegards,\nAmerican Iron Team`
    };
  }
};

/**
 * Generates an exact part photo using Gemini 3 Pro Image with a retry mechanism for transient errors.
 */
export const generatePartImage = async (partNo: string, description: string, size: '1K' | '2K' | '4K' = '1K'): Promise<string | null> => {
  const cleanDesc = description.replace(/CAT COMPONENT|CAT PART|ASSEMBLY/gi, '').trim();
  const prompt = `Highly detailed industrial product catalog photograph of Caterpillar heavy machinery part ${partNo}. ${cleanDesc}. Isolated on pure white background, studio lighting, professional 8k resolution.`;

  const MAX_RETRIES = 3;
  const INITIAL_DELAY_MS = 1000;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // API Key Selection check mandatory for gemini-3-pro-image-preview
      if (typeof window !== 'undefined' && window.aistudio) {
          if (!(await window.aistudio.hasSelectedApiKey())) {
              await window.aistudio.openSelectKey();
          }
      }

      // Create a new GoogleGenAI instance right before making an API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: { 
          imageConfig: { 
            aspectRatio: "1:1", 
            imageSize: size 
          } 
        }
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          // Success! Return the image data.
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      // If no image part is found, but the request succeeded, don't retry.
      return null; 

    } catch (error: any) {
      console.error(`Image generation hub error (Attempt ${attempt + 1}/${MAX_RETRIES}):`, error);

      // Check for a retryable error (e.g., 503 overload)
      const isRetryable = error.message?.includes("503") || error.message?.includes("UNAVAILABLE") || error.message?.includes("overloaded");

      if (isRetryable && attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`Model is overloaded. Retrying in ${Math.round(delay / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Go to the next attempt
      }

      // Handle the separate, non-retryable API key error
      if (error.message?.includes("Requested entity was not found.") && typeof window !== 'undefined' && window.aistudio) {
          await window.aistudio.openSelectKey();
      }
      
      // If it's the last attempt or not a retryable error, break the loop.
      break;
    }
  }

  // If all retries fail, return null.
  return null;
};

/**
 * Analyzes an uploaded photo using Gemini 3 Pro.
 */
export const analyzePartPhoto = async (base64Data: string, mimeType: string): Promise<string> => {
  // Create a new GoogleGenAI instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data.split(',')[1] || base64Data } },
          { text: "Analyze this heavy machinery part. Identify the component, evaluate its condition if visible, and suggest relevant Caterpillar part numbers or maintenance steps." }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    // Accessing text as a property
    return response.text || "No analysis generated for this image.";
  } catch (error) {
    console.error("Vision Analysis Error:", error);
    return "The vision engineering hub is currently offline.";
  }
};