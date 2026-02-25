
import { GoogleGenAI, Type } from "@google/genai";
import { VaultType, VaultItem } from "../types";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please ensure your environment is configured or a key is selected.");
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
export const identifyAndAppraise = async (base64Image: string, category: VaultType, mode: 'fast' | 'intelligence' = 'intelligence') => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1];
  const model = mode === 'intelligence' ? 'gemini-3.1-pro-preview' : 'gemini-flash-latest';

  const systemInstruction = `You are an expert ${category} appraiser and cataloger.
Your task is to identify the specific item in the provided image and provide a detailed appraisal.

Identification Steps:
1. Perform high-accuracy OCR to extract all text from the item (Name, Year, Brand, Card Number, Series, etc.).
2. Analyze visual elements (artwork, logos, holographic patterns, borders) to confirm the specific edition.
3. Use Google Search to find the most recent market value (eBay sold listings, specialized marketplaces) and any special significance (e.g., Rookie Card, 1st Appearance, Short Print, Error Card).

Output Requirements:
- Return ONLY a valid JSON object.
- If identification is uncertain, provide the most likely match based on visible evidence.
- Ensure 'estimatedValue' is a number representing USD.

JSON Schema:
{
  "name": "Full Name of Item",
  "year": "YYYY",
  "brand": "Manufacturer/Publisher",
  "cardNumber": "Specific ID or Number",
  "significance": "Key collector attributes",
  "rarity": "Common/Uncommon/Rare/Ultra-Rare",
  "condition": "Estimated condition (e.g. Near Mint, Very Fine)",
  "estimatedValue": 0.00,
  "facts": ["Fact 1", "Fact 2", "Fact 3"]
}`;

  return await callWithRetry(async () => {
    const result = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: `Identify and appraise this ${category} item. Focus on reading small text and identifying the specific edition. Return JSON.` }
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
            rarity: { type: Type.STRING },
            condition: { type: Type.STRING },
            estimatedValue: { type: Type.NUMBER },
            facts: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["name", "year", "brand", "cardNumber", "significance", "estimatedValue", "facts", "rarity", "condition"]
        }
      }
    });

    let data;
    try {
      data = JSON.parse(result.text || '{}');
    } catch (e) {
      data = extractJSON(result.text || '');
    }
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
        significance: data.significance + (mode === 'fast' ? ' (Fast Scan)' : ''),
        rarity: data.rarity,
        condition: data.condition,
        estimatedValue: data.estimatedValue,
        facts: data.facts,
        sources
      };
    }
    throw new Error("Could not parse AI response.");
  }, mode === 'intelligence' ? 3 : 5, 3000);
};

export const searchAndAppraiseByText = async (query: string, category: VaultType) => {
  const ai = getAI();

  const systemInstruction = `You are an expert ${category} appraiser and cataloger.
Your task is to identify the specific item described by the user and provide a detailed appraisal using real-time market data.

Steps:
1. Use Google Search to find the exact item, its current market value (eBay sold listings, specialized marketplaces), and any special significance (e.g., Rookie Card, 1st Appearance, Short Print, Error Card).
2. Determine the rarity and typical condition for such an item.

Output Requirements:
- Return ONLY a valid JSON object.
- Ensure 'estimatedValue' is a number representing USD.

JSON Schema:
{
  "name": "Full Name of Item",
  "year": "YYYY",
  "brand": "Manufacturer/Publisher",
  "cardNumber": "Specific ID or Number",
  "significance": "Key collector attributes",
  "rarity": "Common/Uncommon/Rare/Ultra-Rare",
  "condition": "Typical condition (e.g. Near Mint)",
  "estimatedValue": 0.00,
  "facts": ["Fact 1", "Fact 2", "Fact 3"]
}`;

  return await callWithRetry(async () => {
    const result = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `Identify and appraise this ${category} item: "${query}". Return JSON.`,
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
            rarity: { type: Type.STRING },
            condition: { type: Type.STRING },
            estimatedValue: { type: Type.NUMBER },
            facts: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["name", "year", "brand", "cardNumber", "significance", "estimatedValue", "facts", "rarity", "condition"]
        }
      }
    });

    let data;
    try {
      data = JSON.parse(result.text || '{}');
    } catch (e) {
      data = extractJSON(result.text || '');
    }
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
        rarity: data.rarity,
        condition: data.condition,
        estimatedValue: data.estimatedValue,
        facts: data.facts,
        sources
      };
    }
    throw new Error("Could not parse AI response.");
  }, 5, 3000);
};

export const reEvaluateItem = async (item: VaultItem) => {
  const ai = getAI();
  return callWithRetry(async () => {
    const query = `Latest auction prices and significance for: ${item.year} ${item.brand} ${item.title} ${item.subTitle} (${item.category}). Return JSON.`;

    const result = await ai.models.generateContent({
      model: 'gemini-flash-latest',
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

    const data = extractJSON(result.text || '');
    return data ? { ...data, sources } : null;
  });
};

export const aiFilterItems = async (query: string, items: VaultItem[]) => {
  const ai = getAI();
  
  const itemSummary = items.map(i => ({
    id: i.id,
    title: i.title,
    subTitle: i.subTitle,
    year: i.year,
    brand: i.brand,
    value: i.estimatedValue,
    significance: i.significance,
    rarity: i.rarity,
    condition: i.condition
  }));

  const systemInstruction = `You are a data filtering assistant for a collectible vault.
Your task is to analyze a user's natural language search query and return a list of item IDs that match the criteria.

Criteria can include:
- Specific players or titles
- Year ranges (e.g., "from the 90s", "before 2000")
- Value thresholds (e.g., "worth more than $100")
- Specific brands or manufacturers
- Significance (e.g., "rookie cards", "first appearances")
- Rarity (e.g., "ultra rare", "common")
- Condition (e.g., "near mint", "mint")

Return ONLY a JSON array of strings (the IDs). If no items match, return an empty array [].`;

  return callWithRetry(async () => {
    const result = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `User Query: "${query}"\n\nItems to filter:\n${JSON.stringify(itemSummary)}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    try {
      return JSON.parse(result.text || '[]');
    } catch (e) {
      console.error("AI Filter Parse Error", e);
      return [];
    }
  });
};

export const getCollectionInsights = async (items: VaultItem[]) => {
  const ai = getAI();
  const summary = items.map(i => `${i.year} ${i.brand} ${i.title} ($${i.estimatedValue})`).join(', ');

  const systemInstruction = `You are a professional collection advisor. 
Analyze the provided list of collectibles and provide 3 concise, high-impact insights about the collection's value, diversity, or potential growth.
Return ONLY a JSON array of 3 strings.`;

  return callWithRetry(async () => {
    const result = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `Collection Summary: ${summary}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    try {
      return JSON.parse(result.text || '[]');
    } catch (e) {
      return ["Collection looks solid.", "Keep adding rare items.", "Monitor market trends."];
    }
  });
};
