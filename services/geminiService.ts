
import { GoogleGenAI, Type } from "@google/genai";
import { CollectionItem } from "../types";

// Helper to initialize GoogleGenAI with API key from environment
const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not configured");
  return new GoogleGenAI({ apiKey });
};

// Robust JSON extraction helper
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
 * Simple Sports Card Detection using Vision
 */
export const identifySportsCard = async (base64Data: string) => {
  try {
    const ai = getAIInstance();
    const base64Content = base64Data.split(',')[1];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Content
            }
          },
          {
            text: `Identify this sports card. Extract the player name, the card set/year, and the card number.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Player Name" },
            subTitle: { type: Type.STRING, description: "Set & Card #" },
            provider: { type: Type.STRING, description: "Manufacturer (Topps, Panini, etc.)" },
            year: { type: Type.STRING, description: "YYYY" },
            keyFeatures: { type: Type.STRING, description: "Notable traits (Rookie, Holo, etc.)" }
          },
          required: ["title", "subTitle", "provider", "year"]
        }
      }
    });

    // Access .text property directly as per guidelines
    const text = response.text;
    return text ? extractJSON(text) : null;
  } catch (error) {
    console.error("Identification failed:", error);
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
    
    // First call uses Google Search for research
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // Extract grounding chunks to comply with Google Search grounding requirements
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Research Source",
        uri: chunk.web.uri
      }));

    // Second call to format the grounded research into structured JSON
    const formattingResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on this research: "${response.text}", extract the market value and 3-4 interesting facts about this specific collectible.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.NUMBER, description: "Market value in USD" },
            facts: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "3-4 interesting facts"
            },
            justification: { type: Type.STRING, description: "Short summary of price reasoning" }
          },
          required: ["value", "facts", "justification"]
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
