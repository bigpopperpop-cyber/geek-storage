
import { GoogleGenAI, Type } from "@google/genai";
import { VaultType, VaultItem } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure your environment is configured.");
  }
  return new GoogleGenAI({ apiKey });
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Helper to handle 429 errors with automatic retries
 */
async function callWithRetry(fn: () => Promise<any>, retries = 3, backoff = 2000): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
    if (isRateLimit && retries > 0) {
      console.log(`Rate limit hit. Retrying in ${backoff}ms... (${retries} retries left)`);
      await delay(backoff);
      return callWithRetry(fn, retries - 1, backoff * 2);
    }
    throw error;
  }
}

const extractJSON = (text: string) => {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch (e) {
    console.error("JSON Extraction Error", e, "Raw text:", text);
    return null;
  }
};

/**
 * One-shot Identification and Research to save quota.
 */
export const identifyAndAppraise = async (base64Image: string, category: VaultType) => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1];

  const systemInstruction = `You are a World-Class ${category} Cataloger. 
Your goal is to identify an item from a photo (often a 3x telephoto macro shot) and return data in valid JSON format.

Instructions:
1. Identify Name, Year, Brand, and Card/Issue Number.
2. Use Google Search to find real-time market value and collector significance (Rookie status, 1st appearances).
3. Return ONLY the JSON object.

JSON Schema:
{
  "name": "Full Name",
  "year": "YYYY",
  "brand": "Manufacturer",
  "cardNumber": "Number",
  "significance": "Key attribute (e.g. Rookie Card)",
  "estimatedValue": 0.00,
  "facts": ["Fact 1", "Fact 2", "Fact 3"]
}`;

  return callWithRetry(async () => {
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: `Identify and appraise this ${category} item. Return JSON.` }
        ]
      },
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            year: { type: Type.STRING },
            brand: { type: Type.STRING },
            cardNumber: { type: Type.STRING },
            significance: { type: Type.STRING },
            estimatedValue: { type: Type.NUMBER },
            facts: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["name", "year", "brand", "cardNumber", "significance", "estimatedValue", "facts"]
        }
      }
    });

    const data = extractJSON(result.text);
    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Market Source",
        uri: chunk.web.uri
      }));

    if (data) {
      return {
        title: data.name,
        subTitle: data.cardNumber ? `#${data.cardNumber}` : '',
        year: data.year,
        brand: data.brand,
        cardNumber: data.cardNumber,
        significance: data.significance,
        estimatedValue: data.estimatedValue,
        facts: data.facts,
        sources
      };
    }
    throw new Error("Could not parse AI response.");
  });
};

export const reEvaluateItem = async (item: VaultItem) => {
  const ai = getAI();
  return callWithRetry(async () => {
    const query = `Latest auction prices and significance for: ${item.year} ${item.brand} ${item.title} ${item.subTitle} (${item.category}). Return JSON.`;

    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedValue: { type: Type.NUMBER },
            updatedFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
            significance: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          },
          required: ["estimatedValue", "updatedFacts", "significance", "reasoning"]
        }
      }
    });

    const sources = result.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((c: any) => c.web)
      ?.map((c: any) => ({ title: c.web.title || "Market Source", uri: c.web.uri })) || [];

    const data = extractJSON(result.text);
    return data ? { ...data, sources } : null;
  });
};
