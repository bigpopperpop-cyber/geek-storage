
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
 * Uses Google Search grounding to find real-time market data.
 */
export const identifyCollectible = async (base64Image: string, category: VaultType) => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1];

  // Step 1: Visual Identification - Fingerprint the item
  const visionPrompt = `Identify this ${category} collectible. Be specific about the title, player/character name, set/series name, issue/card number, and year.`;
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

  // Step 2: Grounded Market Research
  // We use Google Search to find current prices and historical significance
  const researchPrompt = `Research real-time market details and collector significance for: "${identity}" in the ${category} category.
  Specifically look for:
  - Recent sold prices (eBay, auction houses).
  - Key traits: Is it a Rookie Card? 1st appearance? Rare mint mark? Variant/Holo?
  - 3 unique historical facts about this specific release.`;

  const researchRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: researchPrompt,
    config: { tools: [{ googleSearch: {} }] }
  });

  // Extract grounding URLs as per requirements
  const groundingChunks = researchRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title || "Market Research",
      uri: chunk.web.uri
    }));

  // Step 3: Structured Data Synthesis
  // Take the grounded research and turn it into a clean database object
  const finalPrompt = `Based on this research data: "${researchRes.text}", structure the information into a JSON object.
  
  JSON Schema Requirements:
  - "estimatedValue": Current market average in USD.
  - "significance": A punchy one-sentence summary of why collectors want this (e.g., "Highly coveted 1st appearance of Venom").
  - "facts": exactly 3 interesting historical or market facts.`;

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
        },
        required: ["title", "subTitle", "year", "provider", "significance", "estimatedValue", "facts"]
      }
    }
  });

  const data = extractJSON(finalRes.text);
  return data ? { ...data, sources } : null;
};

/**
 * Re-evaluates the price and updates facts for an existing item using Google Search.
 */
export const reEvaluateItem = async (item: VaultItem) => {
  const ai = getAI();
  const query = `Latest market value and auction prices for: ${item.year} ${item.provider} ${item.title} ${item.subTitle} (${item.category}). Provide reasoning for the price change.`;

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
        },
        required: ["estimatedValue", "updatedFacts", "reasoning"]
      }
    }
  });

  const data = extractJSON(res.text);
  
  const groundingChunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title || 'Market Source',
      uri: chunk.web.uri
    }));

  return data ? { ...data, sources } : null;
};
