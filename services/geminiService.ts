
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
 * Identify item + Deep Market Search for Significance (Rookie/1st App)
 */
export const identifyAndAppraise = async (base64Image: string, category: VaultType) => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1];

  // 1. Identify visually
  const visionRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        { text: `Precisely identify this ${category} item. Return title, year, and manufacturer.` }
      ]
    }
  });

  const identity = visionRes.text;
  if (!identity) throw new Error("ID failed");

  // 2. Grounded Market Research
  const researchRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Research current market value and collector significance for: "${identity}". 
    Specifically look for "Key" status: Is it a Rookie Card? Is it a 1st appearance of a character? Is it a rare variety? 
    Find 3 historical facts.`,
    config: { tools: [{ googleSearch: {} }] }
  });

  const groundingChunks = researchRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title || "Market Source",
      uri: chunk.web.uri
    }));

  // 3. Final Structure
  const finalRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on this research: "${researchRes.text}", fill this JSON.
    Value should be a number. Significance should mention things like Rookie or 1st Appearance if found.`,
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

// Refactored to separate search from JSON formatting and added reasoning
export const reEvaluateItem = async (item: VaultItem) => {
  const ai = getAI();
  const query = `Current market price and auction history for: ${item.year} ${item.provider} ${item.title} ${item.subTitle} (${item.category}).`;

  // 1. Search for current market data
  const researchRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: { 
      tools: [{ googleSearch: {} }]
    }
  });

  const sources = researchRes.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((c: any) => c.web)
    ?.map((c: any) => ({ title: c.web.title || "Market Source", uri: c.web.uri })) || [];

  // 2. Format research into structured response
  const formatRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize this research: "${researchRes.text}" into the requested JSON schema. Provide a brief 'reasoning' for the value change.`,
    config: {
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

  const data = extractJSON(formatRes.text);
  return data ? { ...data, sources } : null;
};
