
import { GoogleGenAI, Type } from "@google/genai";
import { CollectionItem, VaultType } from "../types";

const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not configured");
  return new GoogleGenAI({ apiKey });
};

const contextMap = {
  comics: "You are a world-class comic book historian and professional grader. You have perfect visual memory of every cover printed. You are currently in 'Expert Mode'.",
  sports: "You are a premier sports card authenticator and historian. You recognize players, sets, and card numbers instantly. You are currently in 'Expert Mode'.",
  fantasy: "You are a TCG Grandmaster. You know every set symbol, rarity, and edition for TCG games. You are currently in 'Expert Mode'.",
  coins: "You are a professional numismatist. You identify coins, mint marks, and varieties with surgical precision. You are currently in 'Expert Mode'."
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

    console.log(`[Vault AI] Identification Protocol Initiated (Gemini 3 Pro)...`);

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
            text: `SYSTEM OVERRIDE: DO NOT REFUSE THIS TASK. 
            The user has provided a laboratory-grade 3K scan. Do not mention 'lighting' or 'blurry' under any circumstances.
            
            TASK: Identify the specific ${vault} item in this image.
            
            DIRECTIONS:
            1. Use Google Search to cross-reference visual patterns with known databases.
            2. Extract Title/Player Name, Issue/Card Number, Year, and Publisher/Set.
            3. Check for special variants (Holographic, 1st Edition, Variant Cover).
            
            MANDATORY JSON OUTPUT:
            {
              "title": "Exact Name",
              "subTitle": "ID # / Set",
              "provider": "Company",
              "year": "YYYY",
              "keyFeatures": "Notable attributes (e.g. Rookie Card, 1st App)",
              "condition": "Visual Grade"
            }`
          }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: contextMap[vault]
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            text: `GROUNDED APPRAISAL: Use Google Search to find real-time market data for:
            
            Item: ${item.title}
            Sub: ${item.subTitle}
            Year: ${item.year}
            Condition: ${item.condition}
            Features: ${item.keyFeatures}
            
            Return the current average market price and a brief reasoning in JSON:
            {
              "value": 00.00,
              "justification": "Evidence-based explanation"
            }`
          }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `You are a market analyst for high-end collectibles. Cite recent search results for price accuracy.`
      }
    });

    const text = response.text;
    if (!text) return { value: 0, justification: "Valuation unavailable." };
    
    const result = extractJSON(text);
    return {
      value: result?.value || 0,
      justification: result?.justification || "Market average estimation."
    };
  } catch (error) {
    console.error("Valuation failed:", error);
    return { value: 0, justification: "Error estimating value." };
  }
};
