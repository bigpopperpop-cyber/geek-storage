
import { GoogleGenAI } from "@google/genai";

const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not configured");
  return new GoogleGenAI({ apiKey });
};

const extractJSON = (text: string) => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
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
 * Simple Sports Card Detection
 * Identifies the player and set from a photo.
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
            text: `Identify this sports card. Extract the player name, the card set/year, and the card number.
            
            Return JSON:
            {
              "title": "Player Name",
              "subTitle": "Set & Card #",
              "provider": "Manufacturer (Topps, Panini, etc.)",
              "year": "YYYY",
              "keyFeatures": "Notable traits (Rookie, Holo, etc.)"
            }`
          }
        ]
      }
    });

    const text = response.text;
    return text ? extractJSON(text) : null;
  } catch (error) {
    console.error("Identification failed:", error);
    return null;
  }
};
