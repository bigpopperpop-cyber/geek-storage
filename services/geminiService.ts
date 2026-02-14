
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
 * 
 * Optimization: Optimized for iPhone 14 Pro 3x Telephoto captures where text is 
 * extremely sharp but might only show a portion of the card.
 */
export const identifyAndAppraise = async (base64Image: string, category: VaultType) => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1];

  const systemInstruction = `You are a World-Class ${category} Cataloger and Market Analyst. 
You specialize in identifying items from high-resolution, zoomed-in photos (Macro/Telephoto).

Instructions for Telephoto/3x Zoom Shots:
- Fragment Awareness: If the image is a zoomed-in shot (common on iPhone 14 Pro 3x), look for the Card Number (e.g., #245), Player Name fragments, and the Year printed in the fine print or stat lines.
- Prioritize the 'Back': Small card numbers and stat blocks are the "fingerprint" of the item. Use them as primary identifiers even if the full card isn't in frame.
- OCR Requirement: Extract Name, Year, Brand/Manufacturer, and Card/Issue Number from even blurry or high-contrast macro shots.
- Search Grounding: Cross-reference the extracted card number and year with Google Search to confirm the set (e.g., '1992 Topps Stadium Club #345').
- Key Status: Flag Rookie (RC), 1st Appearances, or Error varieties immediately.
- Glare Resilience: Disregard reflections from plastic 'penny sleeves' or top-loaders.`;

  // Step 1: Visual Identification & Verification via Search
  const visionRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        { text: `Precisely identify this ${category} item. This might be a high-detail 3x zoom macro shot of a specific text area (like the card number or stat block). Extract all identifying markers.` }
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
    contents: `Based on this ID: "${identity}", research current market value (raw/ungraded), auction results, and collector significance. 
    Confirm if it's a "Key" item (Rookie, 1st App, Rare Variation). Find 3 specific market facts.`,
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
    contents: `Based on this research: "${researchRes.text}", fill the following JSON structure exactly. Value should be a numeric USD estimate for a raw version.
    
    JSON Template:
    {
      "name": "Full Item/Player Name",
      "year": "YYYY",
      "brand": "Brand/Manufacturer",
      "cardNumber": "Number",
      "significance": "One-sentence significance (e.g. Rookie Card / First Appearance)",
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
  const query = `Research latest auction prices, market value, and specific collector significance (Rookie status, 1st appearances, rarity, HOF status) for: ${item.year} ${item.brand} ${item.title} ${item.subTitle} (${item.category}). Use Google Search.`;

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
    contents: `Summarize this research: "${researchRes.text}" into JSON. 
    Crucially, check if this is a "Key" item (Rookie, 1st App) and update the significance.
    Include "estimatedValue" (number), "updatedFacts" (array), "significance" (string), and "reasoning" (string).`,
    config: {
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

  const data = extractJSON(formatRes.text);
  return data ? { ...data, sources } : null;
};
