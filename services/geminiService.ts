
import { GoogleGenAI, Type } from "@google/genai";
import { CollectionItem, VaultType } from "../types";

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
    console.error("JSON Parse Error", e, "Raw text:", text);
    return null;
  }
};

export const identifyItemFromImage = async (base64Data: string, vault: VaultType) => {
  try {
    const ai = getAIInstance();
    const mimePart = base64Data.split(';')[0];
    const mimeType = mimePart.split(':')[1] || 'image/jpeg';
    const base64Content = base64Data.split(',')[1];

    console.log(`[Vault AI] Engaging Gemini 3 Pro Vision for ${vault}...`);

    // Using PRO for identification because FLASH is failing on complex card patterns.
    // Added thinkingBudget to allow the model to analyze the image thoroughly.
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Content
            }
          },
          {
            text: `You are the world's leading expert in ${vault} collectibles. 
            Analyze this image carefully. If it's a card, it might be the front or the back.
            
            1. Look for Player/Character names.
            2. Look for Set years and brand names (Topps, Panini, Upper Deck, Marvel, DC).
            3. Look for card numbers (e.g., #23, #451).
            4. Identify any specific parallels (Holo, Silver, Variant).
            
            Identify the item and return ONLY this JSON:
            {
              "title": "Main Title or Player Name",
              "subTitle": "Card # or Issue #",
              "provider": "Manufacturer or Publisher",
              "year": "Year of Release",
              "keyFeatures": "Notable traits (e.g. Rookie, 1st Appearance, Refractor)",
              "condition": "Visual condition estimate"
            }`
          }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        systemInstruction: `You are an expert ${vault} identifier. You can read tiny text and identify rare items from any angle.`
      }
    });

    const text = response.text;
    if (!text) return null;
    
    return extractJSON(text);
  } catch (error) {
    console.error("Identification failed:", error);
    return null;
  }
};

export const assessItemValue = async (item: Partial<CollectionItem>, vault: VaultType): Promise<{ value: number; justification: string }> => {
  try {
    const ai = getAIInstance();
    // Flash is fine for the text-based search task of valuation
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            text: `VALUATION: Search for real sold prices for this ${vault} item.
            Item: ${item.title} ${item.subTitle}
            Year: ${item.year}
            Condition: ${item.condition}
            Features: ${item.keyFeatures}
            
            Return JSON:
            {
              "value": 0.00,
              "justification": "Short explanation"
            }`
          }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a professional market analyst."
      }
    });

    const text = response.text;
    if (!text) return { value: 0, justification: "Search failed." };
    
    const result = extractJSON(text);
    return {
      value: result?.value || 0,
      justification: result?.justification || "Market average."
    };
  } catch (error) {
    console.error("Valuation failed:", error);
    return { value: 0, justification: "Error." };
  }
};
