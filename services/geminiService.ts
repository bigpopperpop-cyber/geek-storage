
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
 * Optimized for back-of-card scans using OCR and Google Search Grounding.
 */
export const identifyAndAppraise = async (base64Image: string, category: VaultType) => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1];

  // Specific system instructions for identifying tricky scans (especially card backs)
  const systemInstruction = `You are an expert ${category} cataloger and authenticator. 
Your goal is to identify the specific item in any image provided.

1. Prioritize the 'Back': If the image contains a table of statistics, a year (e.g., 1989), and a card/issue number (e.g., #45), use these as your primary identifiers.
2. OCR Requirement: Extract the Name, Year, Brand, and Number from the text.
3. Glare Resilience: Ignore plastic reflections or blueish glares from background screens.
4. Search Grounding: Use Google Search Grounding to verify the exact set name and market significance.
5. Identify if it is a "Key" item (e.g., Rookie Card, 1st Appearance, Rare Variety).`;

  // 1. Identify visually with OCR priority & Google Search
  const visionRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        { text: "Identify this item precisely. If it's a sports card back, focus on the stats and card number to determine the player and set." }
      ]
    },
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }]
    }
  });

  const identity = visionRes.text;
  if (!identity) throw new Error("ID failed");

  // 2. Grounded Market Research for Significance and Value
  // We use the identity found in step 1 to do a deep search
  const researchRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Research current market value and collector significance for: "${identity}". 
    Look for sold prices and price guides. 
    Check "Key" status: Is it a Rookie? 1st appearance? Rare variety? 
    Find 3 historical facts about this specific release.`,
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

  // 3. Final Structured Data Extraction
  const finalRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on this research: "${researchRes.text}", structure the data into the following JSON format.
    
    JSON Schema:
    {
      "name": "Full Player/Item Name",
      "year": "YYYY",
      "brand": "Manufacturer/Brand",
      "cardNumber": "Card # or Issue #",
      "isRookie": boolean,
      "significance": "One-sentence collector significance",
      "estimatedValue": number,
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
          isRookie: { type: Type.BOOLEAN },
          significance: { type: Type.STRING },
          estimatedValue: { type: Type.NUMBER },
          facts: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["name", "year", "brand", "cardNumber", "isRookie", "significance", "estimatedValue", "facts"]
      }
    }
  });

  const data = extractJSON(finalRes.text);
  
  if (data) {
    // Map the model's output back to our VaultItem interface
    return {
      title: data.name,
      subTitle: data.cardNumber,
      year: data.year,
      provider: data.brand,
      significance: data.isRookie ? `Rookie Card - ${data.significance}` : data.significance,
      estimatedValue: data.estimatedValue,
      facts: data.facts,
      sources
    };
  }
  
  return null;
};

export const reEvaluateItem = async (item: VaultItem) => {
  const ai = getAI();
  const query = `Latest auction prices and market value for: ${item.year} ${item.provider} ${item.title} ${item.subTitle} (${item.category}). Use Google Search Grounding.`;

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

  const formatRes = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize this research: "${researchRes.text}" into the requested JSON schema. Provide a 'reasoning' for any value change.`,
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
