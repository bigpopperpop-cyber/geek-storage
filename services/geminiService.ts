
import { GoogleGenAI, Type } from "@google/genai";
import { VaultType, VaultItem } from "../types";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here' || apiKey === '') {
    throw new Error("Gemini API Key is missing or empty. Please check your Vercel environment variables and redeploy your application.");
  }
  return new GoogleGenAI({ apiKey });
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Helper to handle 429 errors with automatic retries
 */
async function callWithRetry(fn: () => Promise<any>, retries = 5, backoff = 2000): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error.message?.includes('429') || 
                        error.message?.includes('RESOURCE_EXHAUSTED') ||
                        error.message?.includes('rate limit');
    
    if (isRateLimit && retries > 0) {
      // Add some jitter to avoid synchronized retries
      const jitter = Math.random() * 1000;
      const waitTime = backoff + jitter;
      
      console.log(`Rate limit hit. Retrying in ${Math.round(waitTime)}ms... (${retries} retries left)`);
      await delay(waitTime);
      return callWithRetry(fn, retries - 1, backoff * 1.5);
    }
    if (isRateLimit) {
      throw new Error("AI is currently busy (Rate Limit hit). You are likely using a Gemini Free Tier API key which has strict limits (2-15 requests per minute). Please wait 30-60 seconds before trying again, or upgrade to a paid tier at ai.google.dev.");
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
export const identifyItemFromImage = async (base64Image: string, category: VaultType, mode: 'fast' | 'intelligence' = 'intelligence'): Promise<any> => {
  const ai = getAI();
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  
  // Choose model based on mode and availability
  const modelName = mode === 'intelligence' ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview';
  
  const systemInstruction = category === 'sports' 
    ? `You are an expert Sports Trading Card Digitizer. Your goal is to analyze uploaded images of sports cards and extract precise metadata.
    
    MANDATORY RULES:
    1. ALWAYS detect the following: Player Name, Year, Brand, Set/Series, Card Number, Team, and Sport.
    2. LOOK for specific parallel indicators (e.g., Gold, Refractor, Printer's Proof).
    3. OUTPUT the results strictly in JSON format.
    4. If a value is not visible, return "Unknown" rather than guessing.
    5. Identify the "Key Attribute" (e.g., Rookie Card, Hall of Famer, Insert).`
    : `You are an expert appraiser and visual recognition specialist for ${category} collectibles.
    Your task is to identify items with 100% precision.
    
    MANDATORY PROCESS:
    1. Analyze the visual features: Identify the player/character, set name, year, card number, and any special parallels or variations (e.g., "Refractor", "Holo", "First Edition").
    2. Extract all visible text: Pay close attention to small print, copyright dates, and set logos.
    3. If you are uncertain about any detail, list the most likely candidates and explain why based on the visual evidence.
    
    Return a JSON object with the identified details.`;

  return await callWithRetry(async (): Promise<any> => {
    const responseSchema = category === 'sports' ? {
      type: Type.OBJECT,
      properties: {
        card_id: { type: Type.STRING, description: "Format: Year-Brand-Number" },
        details: {
          type: Type.OBJECT,
          properties: {
            player: { type: Type.STRING },
            year: { type: Type.INTEGER },
            brand: { type: Type.STRING },
            set: { type: Type.STRING },
            number: { type: Type.STRING },
            team: { type: Type.STRING },
            sport: { type: Type.STRING },
            key_attribute: { type: Type.STRING }
          },
          required: ["player", "year", "brand", "number", "team", "sport"]
        },
        visual_check: {
          type: Type.OBJECT,
          properties: {
            condition_notes: { type: Type.STRING },
            parallel_type: { type: Type.STRING }
          },
          required: ["condition_notes", "parallel_type"]
        }
      },
      required: ["card_id", "details", "visual_check"]
    } : {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        year: { type: Type.STRING },
        brand: { type: Type.STRING },
        cardNumber: { type: Type.STRING },
        uncertaintyReason: { type: Type.STRING, description: "Explain any uncertainty in identification" }
      },
      required: ["name", "year", "brand", "cardNumber"]
    };

    try {
      const result = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: category === 'sports' 
              ? "Digitize this sports card. Extract all metadata and identify key attributes."
              : `Step 1: Analyze the text on this ${category} item and its visual features.
Step 2: Identify the specific Year, Brand, Player/Character Name, and Card Number.
Step 3: Return the confirmed identity in JSON format.` }
          ]
        },
        config: {
          systemInstruction,
          tools: mode === 'intelligence' ? [{ googleSearch: {} }] : [],
          responseMimeType: 'application/json',
          responseSchema: responseSchema as any
        }
      });

      const rawData = extractJSON(result.text || '{}');
      
      // Normalize for the rest of the app
      if (category === 'sports' && rawData.details) {
        return {
          name: rawData.details.player,
          year: String(rawData.details.year),
          brand: rawData.details.brand,
          cardNumber: rawData.details.number,
          team: rawData.details.team,
          sport: rawData.details.sport,
          set: rawData.details.set,
          significance: rawData.details.key_attribute,
          parallel: rawData.visual_check?.parallel_type,
          conditionNotes: rawData.visual_check?.condition_notes
        };
      }
      
      return rawData;
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
      
      // If Pro hits rate limit, immediately try Flash instead of retrying Pro multiple times
      if (mode === 'intelligence' && isRateLimit) {
        console.warn("Gemini Pro rate limited. Falling back to Gemini Flash immediately...");
        return await identifyItemFromImage(base64Image, category, 'fast');
      }
      
      console.error(`Identification failed with ${modelName}:`, error);
      
      // Fallback to Flash if Pro fails for other reasons
      if (mode === 'intelligence') {
        return await identifyItemFromImage(base64Image, category, 'fast');
      }
      throw error;
    }
  }, 3, 1500);
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
  const identified = await identifyItemFromImage(base64Image, category, mode);
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

export const searchAndAppraiseByText = async (query: string, category: VaultType, useFlash: boolean = false, useSearch: boolean = true): Promise<any> => {
  const ai = getAI();
  const model = useFlash ? 'gemini-3-flash-preview' : 'gemini-3.1-pro-preview';

  const systemInstruction = `You are an expert appraiser for ${category} collectibles.
${useSearch ? 'When asked to identify or appraise an item, you MUST first perform a search to confirm the set, year, and player/character.' : 'Identify and appraise this item based on your internal knowledge.'}
Do not rely solely on your internal training data.

MANDATORY PROCESS:
${useSearch ? '1. Search for the specific details provided (Year, Brand, Name, ID) on reliable collector databases and marketplaces.\n2. Cross-reference search results to provide a confirmed identity and an estimated value range based on "Sold" listings.' : '1. Use your internal knowledge to provide a confirmed identity and an estimated value range.'}
3. If you cannot find a 100% match, list the most likely candidates and explain why you are uncertain.

Return ONLY a valid JSON object.`;

  return await callWithRetry(async (): Promise<any> => {
    try {
      const result = await ai.models.generateContent({
        model: model,
        contents: `Step 1: ${useSearch ? 'Perform a deep search' : 'Analyze'} for this ${category} item: "${query}".
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
          tools: useSearch ? [{ googleSearch: {} }] : [],
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
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
      
      if (isRateLimit) {
        if (!useFlash) {
          console.warn("Gemini Pro search rate limited. Falling back to Gemini Flash search...");
          return await searchAndAppraiseByText(query, category, true, useSearch);
        }
        if (useSearch) {
          console.warn("Gemini Search rate limited. Falling back to internal knowledge...");
          return await searchAndAppraiseByText(query, category, useFlash, false);
        }
      }
      throw error;
    }
  }, 3, 2000);
};

export const reEvaluateItem = async (item: VaultItem, useFlash: boolean = false, useSearch: boolean = true): Promise<any> => {
  const ai = getAI();
  const model = useFlash ? 'gemini-3-flash-preview' : 'gemini-3.1-pro-preview';
  
  const systemInstruction = `You are a world-class collectible appraiser and market analyst.
Your task is to perform an exhaustive, in-depth market analysis for the item provided.
${useSearch ? 'You MUST use the Google Search tool to find the most recent and accurate data.' : 'Use your internal knowledge to provide the most accurate data possible.'}

Focus on:
1. Recent sold prices from reputable auction houses and marketplaces (eBay, Heritage, Goldin, etc.).
2. Population reports, scarcity, and known variations.
3. Historical significance and provenance.
4. Current market sentiment and investment outlook.

Return your findings in a structured JSON format.`;

  return callWithRetry(async (): Promise<any> => {
    try {
      const queryText = `Step 1: Analyze the current item details: ${item.year} ${item.brand} ${item.title} ${item.subTitle} (${item.category}).
Step 2: ${useSearch ? 'Use Google Search to find recent "Sold" listings on eBay, Heritage, and other major auction houses.' : 'Use your internal knowledge to estimate value.'}
Step 3: Search for population reports and known variations that might affect value.
Step 4: Cross-reference all findings to provide a confirmed fair market value and investment outlook.

Return a JSON object with:
- estimatedValue (number): Current fair market value in USD.
- updatedFacts (string[]): 3-5 detailed facts or market insights.
- significance (string): The single most important historical or market detail.
- reasoning (string): A brief justification of the value based on your search.
- investmentOutlook (string): 1-2 sentences on the future value potential.`;

      const result = await ai.models.generateContent({
        model: model,
        contents: queryText,
        config: { 
          systemInstruction,
          tools: useSearch ? [{ googleSearch: {} }] : [],
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
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
      if (isRateLimit) {
        if (!useFlash) {
          console.warn("Gemini Pro re-evaluation rate limited. Falling back to Gemini Flash...");
          return await reEvaluateItem(item, true, useSearch);
        }
        if (useSearch) {
          console.warn("Gemini Search rate limited. Falling back to internal knowledge...");
          return await reEvaluateItem(item, useFlash, false);
        }
      }
      throw error;
    }
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
