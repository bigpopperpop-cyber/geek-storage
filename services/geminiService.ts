
import { GoogleGenAI, Type } from "@google/genai";
import { CollectionItem, VaultType } from "../types";

const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not configured");
  return new GoogleGenAI({ apiKey });
};

// Robust identification instructions per vault
const identificationProtocols = {
  comics: "Identify the COMIC BOOK. Extract: Title, Issue Number, Month/Year, and Publisher. Ignore glares.",
  sports: "Identify the SPORTS CARD. Extract: Player Name, Year, Set Name (Topps, Panini, etc.), and Card Number. Read tiny text.",
  fantasy: "Identify the TCG CARD. Extract: Card Name, Set Code, and Edition. Look for rarity symbols.",
  coins: "Identify the COIN. Extract: Denomination, Mint Mark, and Year. Focus on fine metal details."
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

    console.log(`[Vault AI] Initiating Visual Identification for ${vault}...`);

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
            text: `SYSTEM MANDATE: You are a high-speed vision identification engine.
            
            TASK: Identify this ${vault.toUpperCase()} item.
            
            IDENTIFICATION PROTOCOL:
            1. Perform deep OCR to read ALL text on the item.
            2. Match visual patterns against historical databases.
            3. Ignore photographic artifacts (glares, shadows, blur).
            
            ${identificationProtocols[vault]}
            
            Return ONLY a JSON object:
            {
              "title": "Main Name/Title",
              "subTitle": "ID Number/Set Info",
              "provider": "Company/Publisher",
              "year": "YYYY",
              "keyFeatures": "Notable traits (Rookie, 1st App, Parallel)",
              "condition": "Visual Grade"
            }`
          }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are an expert ${vault} identifier. You never fail to identify an item from a high-res image. You focus on the text and visual markings."
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
            text: `VALUATION REQUEST: Search market data for this ${vault} item.
            
            Item: ${item.title}
            Sub: ${item.subTitle}
            Year: ${item.year}
            Condition: ${item.condition}
            Features: ${item.keyFeatures}
            
            Provide the average current market price and justification.
            
            Return JSON:
            {
              "value": 0.00,
              "justification": "Short reason"
            }`
          }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a market data analyst specializing in collectibles."
      }
    });

    const text = response.text;
    if (!text) return { value: 0, justification: "Valuation failed." };
    
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
