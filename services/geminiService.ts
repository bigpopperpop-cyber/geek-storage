
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
 * Expert Cataloger Logic:
 * 1. Prioritize Back-of-Card OCR (Stats, Numbers).
 * 2. Ground Market Research with Google Search.
 * 3. Extract structured JSON.
 */
export const identifyAndAppraise = async (base64Image: string, category: VaultType) => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1];

  const systemInstruction = `You are an expert ${category} cataloger and Market Analyst. Your goal is to identify items from images (front or back) and provide precise market data.

Instructions:
- Prioritize the 'Back': If the image contains a table of statistics, a year, and a card/issue number (e.g., #45), use these as primary identifiers.
- OCR Requirement: Extract Name, Year, Brand/Manufacturer, and Card/Issue Number.
- Search Grounding: Use Google Search Grounding to verify the specific market name and significance.
- Key Status: Identify if it is a 'Key' item (Rookie, 1st Appearance, Rare Variety).
- Glare Resilience: Ignore monitor glare or plastic reflections.`;

  // Step 1: Visual Identification & Verification via Search
  const visionRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        { text: `Identify this ${category} item precisely. Focus on text/OCR if it's the back of the item.` }
      ]
    },
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }]
    }
  });

  const identity = visionRes.text;
  if (!identity) throw new Error("Identification failed");

  // Step 2: Deep Market Appraisal
  const researchRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Research current market value, auction results, and significance for: "${identity}". 
    Look for "Key" status (Rookie/1st App) and find 3 historical/market facts.`,
    config: { 
      systemInstruction,
      tools: [{ googleSearch: {} }] 
    }
  });

  const groundingChunks = researchRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title || "Market Source",
      uri: chunk.web.uri
    }));

  // Step 3: Structured Data Output
  const finalRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on this research: "${researchRes.text}", fill the following JSON structure exactly. Value should be a numeric USD estimate.
    
    JSON Template:
    {
      "name": "Full Item/Player Name",
      "year": "YYYY",
      "brand": "Brand/Manufacturer",
      "cardNumber": "Number",
      "significance": "One-sentence collector significance (e.g. Rookie Card)",
      "estimatedValue": 0.00,
      "facts": ["Fact 1", "Fact 2", "Fact 3"]
    }`,
    config: {
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

  const data = extractJSON(finalRes.text);
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
  return null;
};

export const reEvaluateItem = async (item: VaultItem) => {
  const ai = getAI();
  const query = `Latest auction prices for: ${item.year} ${item.brand} ${item.title} ${item.subTitle} (${item.category}).`;

  const researchRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: { tools: [{ googleSearch: {} }] }
  });

  const sources = researchRes.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((c: any) => c.web)
    ?.map((c: any) => ({ title: c.web.title || "Market Source", uri: c.web.uri })) || [];

  const formatRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize this research: "${researchRes.text}" into JSON with "estimatedValue" (number), "updatedFacts" (array), and "reasoning" (string).`,
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
