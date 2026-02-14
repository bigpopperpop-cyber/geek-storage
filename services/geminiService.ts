
import { GoogleGenAI, Type } from "@google/genai";
import { CollectionItem, VaultType } from "../types";

const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not configured");
  return new GoogleGenAI({ apiKey });
};

const extractJSON = (text: string) => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Parse Error", e);
    return null;
  }
};

/**
 * Advanced Collectible Identification
 * Uses Vision + Google Search to identify significance (Rookies, 1st Apps, etc.)
 */
export const identifyItem = async (base64Data: string, vault: VaultType) => {
  try {
    const ai = getAIInstance();
    const base64Content = base64Data.split(',')[1];

    // Step 1: Visual identification
    const visionResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Content } },
          { text: `Identify this ${vault} item. What is the title/player, set/publisher, and year?` }
        ]
      }
    });

    const basicInfo = visionResponse.text;
    if (!basicInfo) return null;

    // Step 2: Grounded research for specifics (Rookie, 1st App, Rarity)
    const researchResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a market search for this ${vault} item: "${basicInfo}". 
      Identify its significance: Is it a Rookie Card? Is it a "Key Issue" (1st appearance of a character)? Is it an error card? 
      Also find 3 interesting facts about it.`,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    // Step 3: Format into clean JSON
    const formattingResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on this research: "${researchResponse.text}", provide structured data.
      
      Return ONLY JSON:
      {
        "title": "Player Name or Book Title",
        "subTitle": "Set/Series and Number",
        "provider": "Manufacturer or Publisher",
        "year": "YYYY",
        "keyFeatures": "Main significance (e.g. Rookie Card, 1st App of Venom, High Grade Candidate)",
        "facts": ["Fact 1", "Fact 2", "Fact 3"],
        "estimatedValue": 0.00
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subTitle: { type: Type.STRING },
            provider: { type: Type.STRING },
            year: { type: Type.STRING },
            keyFeatures: { type: Type.STRING },
            facts: { type: Type.ARRAY, items: { type: Type.STRING } },
            estimatedValue: { type: Type.NUMBER }
          }
        }
      }
    });

    return extractJSON(formattingResponse.text);
  } catch (error) {
    console.error("Advanced Identification failed:", error);
    return null;
  }
};

/**
 * Re-evaluates item price and generates facts using Google Search
 */
export const reEvaluateItem = async (item: CollectionItem) => {
  try {
    const ai = getAIInstance();
    const query = `Current market value and interesting facts for: ${item.year} ${item.provider} ${item.title} ${item.subTitle} in ${item.condition} condition.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Research Source",
        uri: chunk.web.uri
      }));

    const formattingResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on this research: "${response.text}", extract the market value and 3-4 interesting facts about this specific collectible.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.NUMBER },
            facts: { type: Type.ARRAY, items: { type: Type.STRING } },
            justification: { type: Type.STRING }
          }
        }
      }
    });

    const data = extractJSON(formattingResponse.text);
    return data ? { ...data, sources } : null;
  } catch (error) {
    console.error("Re-evaluation failed:", error);
    return null;
  }
};
