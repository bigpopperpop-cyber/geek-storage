
import { GoogleGenAI, Type } from "@google/genai";
import { CollectionItem, VaultType } from "../types";

const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not configured");
  return new GoogleGenAI({ apiKey });
};

const contextMap = {
  comics: "You are an expert comic book identifier. You focus on the Title, Issue Number, and Publisher visible on the cover.",
  sports: "You are a specialized sports card authenticator. You look for the Player Name, Team, Set Name (e.g., Prizm, Topps, Upper Deck), and the Year. You are excellent at reading tiny text on cards.",
  fantasy: "You are a TCG expert. You identify card names, set symbols, and rarity marks for Pokemon, MTG, and Yu-Gi-Oh.",
  coins: "You are a professional numismatist. You identify coins, years, and mint marks."
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

    console.log(`[Vault AI] Scanning ${vault} item...`);

    // Using Flash for faster, more resilient multimodal processing
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
            text: `IDENTIFY THIS ${vault.toUpperCase()} ITEM.
            
            IMPORTANT: Ignore any camera glares, shadows, or minor blur. The image is provided for identification only.
            
            1. READ TEXT: Look for Player Name, Set Name, Year, and Number.
            2. VISUAL MATCH: Recognize the specific card design or artwork.
            3. GOOGLE SEARCH: Cross-reference visual details with current databases.
            
            OUTPUT ONLY THIS JSON:
            {
              "title": "Main Name (e.g. Michael Jordan)",
              "subTitle": "ID (e.g. #23 / Prizm Silver)",
              "provider": "Company (e.g. Panini)",
              "year": "YYYY",
              "keyFeatures": "Significance (e.g. Rookie Card, Holo)",
              "condition": "Visual Estimate"
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
            text: `APPRAISAL REQUEST: Find current market prices for this ${vault} item.
            
            Item: ${item.title}
            Sub: ${item.subTitle}
            Year: ${item.year}
            Condition: ${item.condition}
            
            Search for recent sales on eBay, 130Point, or auction houses.
            
            OUTPUT ONLY THIS JSON:
            {
              "value": 0.00,
              "justification": "Short reasoning based on search"
            }`
          }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a professional market analyst for collectibles."
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
    return { value: 0, justification: "Valuation error." };
  }
};
