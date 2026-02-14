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

    console.log(`[Vault AI] Engaging Gemini 3 Pro Vision for ${vault} (High-Precision OCR Mode)...`);

    // We use a high thinking budget to ensure the AI parses the tiny text on card backs/fronts
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
            text: `You are a master identification expert for ${vault.toUpperCase()} collectibles. 
            Analyze this image with extreme focus on textual metadata.
            
            IDENTIFICATION PRIORITIES:
            1. SET NAME & CODE: Identify the exact set (e.g., "Silver Tempest", "Modern Horizons 2", "1990 Score"). Look for set codes/symbols (e.g., "SWSH12", "MTG Set Symbol").
            2. CARD NUMBER: Locate the collector number (e.g., "142/195", "No. 23", "#4"). This is often at the bottom or in a corner.
            3. BRAND/TCG: Identify the manufacturer or game (Pokémon, Magic: The Gathering, Topps, Panini, Marvel).
            4. SPECIFIC NAME: Identify the exact name of the character, player, or item.
            5. YEAR: Find the copyright year (usually in small print at the very bottom).
            
            Note: If this is the back of a card, use the legal text and card number as the primary source of truth.
            
            Return ONLY this JSON:
            {
              "title": "Exact Card Name or Player Name",
              "subTitle": "Set Name, Number, and Rarity/Code",
              "provider": "Manufacturer or TCG Brand",
              "year": "YYYY",
              "keyFeatures": "Notable traits (Holo, Rookie, 1st Edition, Full Art)",
              "condition": "Visual condition estimate"
            }`
          }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 12000 },
        systemInstruction: `You are the world's leading expert in ${vault} identification. 
        For Fantasy Vault: You are a specialist in TCGs (Pokémon, Magic, Yu-Gi-Oh!, Lorcana). You know every set symbol and card numbering convention.
        For Sports Vault: You are a professional card grader. You prioritize the card back for precise set and number identification.
        You are immune to camera glare and poor lighting; you extract data through patterns and deep OCR.`
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
            text: `VALUATION: Search market data for this ${vault} item.
            Item: ${item.title}
            ID/Set: ${item.subTitle}
            Year: ${item.year}
            Condition: ${item.condition}
            Features: ${item.keyFeatures}
            
            Look for recent sales of this exact card number and set.
            
            Return JSON:
            {
              "value": 0.00,
              "justification": "Short reason why based on sold listings"
            }`
          }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a professional market analyst for high-end collectibles."
      }
    });

    const text = response.text;
    if (!text) return { value: 0, justification: "Search failed." };
    
    const result = extractJSON(text);
    return {
      value: result?.value || 0,
      justification: result?.justification || "Calculated from market averages."
    };
  } catch (error) {
    console.error("Valuation failed:", error);
    return { value: 0, justification: "Error." };
  }
};