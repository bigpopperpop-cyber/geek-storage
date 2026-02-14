
import { GoogleGenAI, Type } from "@google/genai";
import { VaultType, VaultItem } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure your environment is configured.");
  }
  return new GoogleGenAI({ apiKey });
};

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
 * Optimized for iPhone 14 Pro 3x Telephoto captures.
 */
export const identifyAndAppraise = async (base64Image: string, category: VaultType) => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1];

  const systemInstruction = `You are a World-Class ${category} Cataloger and Market Analyst. 
You specialize in identifying items from high-resolution, zoomed-in photos (Macro/Telephoto).

Instructions for Telephoto/3x Zoom Shots:
- Fragment Awareness: If the image is a zoomed-in shot (common on iPhone 14 Pro 3x), look for the Card Number (e.g., #245), Player Name fragments, and the Year.
- Prioritize the 'Back': Small card numbers and stat blocks are the "fingerprint" of the item. 
- Search Grounding: Cross-reference extracted markers with Google Search to confirm the exact set.
- Output: You must provide structured identification AND deep research findings.`;

  try {
    // Call 1: Identify and Research in a single high-context call to reduce failure points
    const researchRes = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: `Identify this ${category} item precisely (check card number/stats). 
          Then, research its current market value (raw/ungraded), collector significance (Rookie status, 1st appearances), and find 3 historical facts.` }
        ]
      },
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }]
      }
    });

    const researchText = researchRes.text;
    if (!researchText) {
      throw new Error("The AI identified the item but couldn't generate research data.");
    }

    const groundingChunks = researchRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Market Source",
        uri: chunk.web.uri
      }));

    // Call 2: Structure the research into JSON
    const finalRes = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on this research summary: "${researchText}", convert it into JSON format exactly.
      
      JSON Schema:
      {
        "name": "Full Item/Player Name",
        "year": "YYYY",
        "brand": "Brand",
        "cardNumber": "Number",
        "significance": "One-sentence key attribute",
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
    throw new Error("Failed to format the identified data into the required structure.");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Unknown API error occurred during scan.");
  }
};

export const reEvaluateItem = async (item: VaultItem) => {
  const ai = getAI();
  const query = `Research latest auction prices and significance for: ${item.year} ${item.brand} ${item.title} ${item.subTitle} (${item.category}).`;

  try {
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
      contents: `Summarize this research: "${researchRes.text}" into JSON.`,
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
  } catch (error) {
    console.error("Re-evaluation Error:", error);
    return null;
  }
};
