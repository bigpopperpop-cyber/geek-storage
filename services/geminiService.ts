import { GoogleGenAI, Type } from "@google/genai";
import { CollectionItem, VaultType } from "../types";

const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not configured");
  return new GoogleGenAI({ apiKey });
};

const contextMap = {
  comics: "You are a professional comic book appraiser. You have expert knowledge of every comic cover ever printed and can identify them from even partial photos.",
  sports: "You are a top-tier sports card authenticator. You recognize players, card sets, and years instantly from visual cues and tiny text.",
  fantasy: "You are a master TCG historian. You know every set and rarity symbol for Pokemon, Magic, and Yu-Gi-Oh.",
  coins: "You are a professional numismatist. You identify coins, mint marks, and varieties with surgical precision."
};

/**
 * Clean AI response to extract JSON if it's wrapped in markdown blocks
 */
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

    console.log(`[Vault AI] Identifying ${vault} item with 3K High-Res Vision...`);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Content
            }
          },
          {
            text: `Please identify this ${vault} item. 
            The image is a high-resolution 3K scan. Focus on reading all visible text (Player Name, Team, Year, Set Name, Issue Number).
            
            Identify specific variants (e.g., "Silver Prizm", "1st Edition", "Variant Cover").
            
            Return the details in this JSON format:
            {
              "title": "Exact Title/Player Name",
              "subTitle": "ID Number or Set Name",
              "provider": "Publisher/Manufacturer",
              "year": "YYYY",
              "keyFeatures": "Notable attributes (e.g., Rookie Card, Holographic)",
              "condition": "Visual Condition Estimate"
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
            text: `Find the current market value for this ${vault} item:
            Item: ${item.title}
            ID: ${item.subTitle}
            Year: ${item.year}
            Condition: ${item.condition}
            
            Search for recent sold listings on eBay or specialized auction sites.
            
            Return JSON:
            {
              "value": 0.00,
              "justification": "Explanation of price based on recent sales"
            }`
          }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `You are a real-time market analyst for ${vault} collectibles.`
      }
    });

    const text = response.text;
    if (!text) return { value: 0, justification: "Valuation unavailable." };
    
    const result = extractJSON(text);
    return {
      value: result?.value || 0,
      justification: result?.justification || "Calculated from market averages."
    };
  } catch (error) {
    console.error("Valuation failed:", error);
    return { value: 0, justification: "Error estimating value." };
  }
};