
import { GoogleGenAI, Type } from "@google/genai";
import { VaultType, VaultItem } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const extractJSON = (text: string) => {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch (e) {
    console.error("JSON Extraction Error", e);
    return null;
  }
};

/**
 * Identifies a collectible from an image and researches its market value/significance.
 */
export const identifyCollectible = async (base64Image: string, category: VaultType) => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1];

  // Step 1: Visual Identification
  const visionPrompt = `Identify this ${category} collectible. Provide the main title, set/series, year, and manufacturer.`;
  const visionRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        { text: visionPrompt }
      ]
    }
  });

  const identity = visionRes.text;
  if (!identity) throw new Error("Could not identify image");

  // Step 2: Grounded Research
  const researchPrompt = `Research market details for: "${identity}" in the ${category} category. 
  Find:
  1. Current market value range.
  2. Collector significance (e.g., Is it a Rookie Card? 1st appearance of a character? Rare mint mark?).
  3. 3-4 interesting historical facts.`;

  const researchRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: researchPrompt,
    config: { tools: [{ googleSearch: {} }] }
  });

  // Step 3: Structured Output
  const finalPrompt = `Based on this research: "${researchRes.text}", output a clean JSON object for a database.
  
  JSON Schema:
  {
    "title": "Main Name",
    "subTitle": "Set/Series/Issue #",
    "year": "YYYY",
    "provider": "Manufacturer/Publisher",
    "significance": "Key traits like Rookie, 1st App, etc.",
    "keyFeatures": "Summary of significance",
    "estimatedValue": 0.00,
    "facts": ["Fact 1", "Fact 2", "Fact 3"]
  }`;

  const finalRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: finalPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subTitle: { type: Type.STRING },
          year: { type: Type.STRING },
          provider: { type: Type.STRING },
          significance: { type: Type.STRING },
          keyFeatures: { type: Type.STRING },
          estimatedValue: { type: Type.NUMBER },
          facts: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });

  return extractJSON(finalRes.text);
};

/**
 * Re-evaluates the price and updates facts for an existing item.
 */
export const reEvaluateItem = async (item: VaultItem) => {
  const ai = getAI();
  const query = `Latest auction prices and market status for: ${item.year} ${item.provider} ${item.title} ${item.subTitle} (${item.category}).`;

  const res = await ai.models.generateContent({
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
          reasoning: { type: Type.STRING }
        }
      }
    }
  });

  const data = extractJSON(res.text);
  
  // Fixed: Extract grounding metadata chunks for source verification
  const groundingChunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks;
  const sources = groundingChunks?.map((chunk: any) => {
    if (chunk.web) {
      return {
        title: chunk.web.title || 'Market Source',
        uri: chunk.web.uri
      };
    }
    return null;
  }).filter(Boolean) || [];

  return data ? { ...data, sources } : null;
};
