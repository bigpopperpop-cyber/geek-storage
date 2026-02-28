
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
  
  const systemInstruction = `You are an expert appraiser and visual recognition specialist for ${category} collectibles.
Your task is to identify items with 100% precision.

MANDATORY PROCESS:
1. Analyze the visual features: Identify the player/character, set name, year, card number, and any special parallels or variations (e.g., "Refractor", "Holo", "First Edition").
2. Extract all visible text: Pay close attention to small print, copyright dates, and set logos.
3. If you are uncertain about any detail, list the most likely candidates and explain why based on the visual evidence.

Return a JSON object with the identified details.`;

  return await callWithRetry(async () => {
    const result = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: `Step 1: Analyze the text on this ${category} item and its visual features.
Step 2: Identify the specific Year, Brand, Player/Character Name, and Card Number.
Step 3: Return the confirmed identity in JSON format.` }
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
            cardNumber: { type: Type.STRING },
            uncertaintyReason: { type: Type.STRING, description: "Explain any uncertainty in identification" }
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

  const systemInstruction = `You are an expert appraiser for ${category} collectibles.
When asked to identify or appraise an item, you MUST first perform a search to confirm the set, year, and player/character.
Do not rely solely on your internal training data.

MANDATORY PROCESS:
1. Search for the specific details provided (Year, Brand, Name, ID) on reliable collector databases and marketplaces.
2. Cross-reference search results to provide a confirmed identity and an estimated value range based on "Sold" listings.
3. If you cannot find a 100% match, list the most likely candidates and explain why you are uncertain.

Return ONLY a valid JSON object.`;

  return await callWithRetry(async () => {
    const result = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Step 1: Perform a deep search for this ${category} item: "${query}".
Step 2: Find recent sold prices and historical significance.
Step 3: Cross-reference data to provide a confirmed appraisal.
Return the result in JSON format:
{
  "name": "Full Name",
  "year": "YYYY",
  "brand": "Manufacturer",
  "cardNumber": "ID",
  "significance": "Key detail",
  "rarity": "Common/Rare/etc",
  "condition": "Typical condition",
  "estimatedValue": 0.00,
  "facts": ["Fact 1", "Fact 2"],
  "uncertaintyReason": "Optional explanation of any uncertainty"
}`,
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
            facts: { type: Type.ARRAY, items: { type: Type.STRING } },
            uncertaintyReason: { type: Type.STRING }
          },
          required: ["name", "estimatedValue", "facts"]
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

    if (data && data.name) {
      return {
        title: data.name,
        subTitle: data.cardNumber ? `#${data.cardNumber}` : (data.year || ''),
        year: data.year || '',
        brand: data.brand || '',
        cardNumber: data.cardNumber || '',
        significance: data.significance || 'Identified via AI Search',
        rarity: data.rarity || 'Unknown',
        condition: data.condition || 'Raw',
        estimatedValue: data.estimatedValue || 0,
        facts: data.facts || [],
        sources
      };
    }
    throw new Error("AI failed to return valid appraisal data.");
  }, 3, 3000);
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
    const queryText = `Step 1: Analyze the current item details: ${item.year} ${item.brand} ${item.title} ${item.subTitle} (${item.category}).
Step 2: Use Google Search to find recent "Sold" listings on eBay, Heritage, and other major auction houses.
Step 3: Search for population reports and known variations that might affect value.
Step 4: Cross-reference all findings to provide a confirmed fair market value and investment outlook.

Return a JSON object with:
- estimatedValue (number): Current fair market value in USD.
- updatedFacts (string[]): 3-5 detailed facts or market insights.
- significance (string): The single most important historical or market detail.
- reasoning (string): A brief justification of the value based on your search.
- investmentOutlook (string): 1-2 sentences on the future value potential.`;

    const result = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: queryText,
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
          required: ["estimatedValue", "updatedFacts"]
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
