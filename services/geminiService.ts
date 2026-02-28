
import { GoogleGenAI, Type } from "@google/genai";
import { VaultType, VaultItem } from "../types";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing.");
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
 * Step 1: Fast Vision Identification (No Search)
 */
export const identifyItemFromImage = async (base64Image: string, category: VaultType) => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1];
  
  const systemInstruction = `You are a high-speed OCR and visual recognition system for ${category} collectibles.
Your ONLY task is to extract the following text from the image:
1. Item Name (e.g., "Charizard", "Kobe Bryant")
2. Year (e.g., "1999", "2023")
3. Brand/Set (e.g., "Base Set", "Panini Prizm")
4. Card Number/ID (e.g., "4/102", "#138")

Return ONLY a JSON object. Do NOT perform any external searches.`;

  return await callWithRetry(async () => {
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: "Read the text on this card and identify it. Return JSON." }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            year: { type: Type.STRING },
            brand: { type: Type.STRING },
            cardNumber: { type: Type.STRING }
          },
          required: ["name", "year", "brand", "cardNumber"]
        }
      }
    });

    return extractJSON(result.text || '{}');
  }, 3, 2000);
};

/**
 * Step 2: Market Research based on identified text
 */
export const appraiseIdentifiedItem = async (identifiedData: any, category: VaultType) => {
  const query = `${identifiedData.year} ${identifiedData.brand} ${identifiedData.name} ${identifiedData.cardNumber}`;
  return await searchAndAppraiseByText(query, category);
};

/**
 * Legacy wrapper for backward compatibility, now using the two-step process
 */
export const identifyAndAppraise = async (base64Image: string, category: VaultType, mode: 'fast' | 'intelligence' = 'intelligence') => {
  // We'll use the new two-step process here to fix the timeout issues
  const identified = await identifyItemFromImage(base64Image, category);
  if (!identified || !identified.name) {
    throw new Error("Could not identify the item from the image. Please try a clearer photo.");
  }
  
  try {
    return await appraiseIdentifiedItem(identified, category);
  } catch (err) {
    // Fallback if appraisal fails but identification worked
    return {
      title: identified.name,
      subTitle: identified.cardNumber ? `#${identified.cardNumber}` : '',
      year: identified.year,
      brand: identified.brand,
      cardNumber: identified.cardNumber,
      significance: "Identified via Vision (Market Research failed)",
      rarity: "Unknown",
      condition: "Raw",
      estimatedValue: 0,
      facts: ["Could not fetch real-time market data. Please update manually."],
      sources: []
    };
  }
};

export const searchAndAppraiseByText = async (query: string, category: VaultType) => {
  const ai = getAI();

  const systemInstruction = `You are the Collector's Assistant. Your job is to give the Master Coder quick, basic results for collectibles like comics, coins, and cards.

Rules for your responses:
- Be Brief: No long paragraphs. Use simple bullet points in the 'facts' field.
- Tone: Friendly but direct. If you don't know the exact price, give a 'ballpark' estimate based on recent trends.

Standard Format for the data you provide:
1. Name/Year (mapped to 'name' and 'year' fields)
2. Estimated Value (Raw vs. Graded) (mapped to 'estimatedValue' and detailed in 'facts')
3. One Key Thing to Look For (mapped to 'significance')

Your task is to identify the specific item described by the user and provide a detailed appraisal using real-time market data.

Steps:
1. Use Google Search to find the exact item, its current market value, and any special significance.
2. Determine the rarity and typical condition.

Output Requirements:
- Return ONLY a valid JSON object.
- Ensure 'estimatedValue' is a number representing USD.

JSON Schema:
{
  "name": "Full Name of Item",
  "year": "YYYY",
  "brand": "Manufacturer/Publisher",
  "cardNumber": "Specific ID or Number",
  "significance": "THE ONE KEY THING TO LOOK FOR",
  "rarity": "Common/Uncommon/Rare/Ultra-Rare",
  "condition": "Typical condition",
  "estimatedValue": 0.00,
  "facts": ["Value breakdown (Raw vs Graded)", "Key detail 1", "Key detail 2"]
}`;

  return await callWithRetry(async () => {
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
  
  const systemInstruction = `You are a world-class collectible appraiser and market analyst.
Your task is to perform an exhaustive, in-depth market analysis for the item provided.
You MUST use the Google Search tool to find the most recent and accurate data.

Focus on:
1. Recent sold prices from reputable auction houses and marketplaces (eBay, Heritage, Goldin, etc.).
2. Population reports, scarcity, and known variations.
3. Historical significance and provenance.
4. Current market sentiment and investment outlook.

Return your findings in a structured JSON format.`;

  return callWithRetry(async () => {
    const query = `Perform an exhaustive market research and appraisal for this collectible:
Item: ${item.year} ${item.brand} ${item.title} ${item.subTitle}
Category: ${item.category}

MANDATORY: Use the Google Search tool to find current market data. Do not rely on internal knowledge for prices.

Return a JSON object with:
- estimatedValue (number): Current fair market value in USD.
- updatedFacts (string[]): 3-5 detailed facts or market insights.
- significance (string): The single most important historical or market detail.
- reasoning (string): A brief justification of the value based on your search.
- investmentOutlook (string): 1-2 sentences on the future value potential.`;

    const result = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: query,
      config: { 
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedValue: { type: Type.NUMBER },
            updatedFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
            significance: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            investmentOutlook: { type: Type.STRING }
          },
          required: ["estimatedValue", "updatedFacts", "significance"]
        }
      }
    });

    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Market Source",
        uri: chunk.web.uri
      }));

    let data;
    try {
      data = JSON.parse(result.text || '{}');
    } catch (e) {
      data = extractJSON(result.text || '');
    }

    if (data && (data.estimatedValue !== undefined || data.updatedFacts)) {
      return { ...data, sources };
    }
    
    throw new Error("AI failed to return valid research data.");
  }, 3, 3000);
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
      model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-flash-preview',
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
