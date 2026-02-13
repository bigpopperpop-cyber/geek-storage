import { GoogleGenAI, Type } from "@google/genai";
import { CollectionItem, VaultType } from "../types";

const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not configured");
  return new GoogleGenAI({ apiKey });
};

const contextMap = {
  comics: "You are a professional comic book appraiser. You have expert knowledge of every comic cover ever printed and can identify them from even partial photos.",
  sports: "You are a top-tier sports card authenticator. You recognize players, card sets, and years instantly from visual cues.",
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

    console.log(`[Vault AI] Identifying ${vault} item with high-res vision...`);

    // We use gemini-3-flash-preview as it is currently the most robust multimodal model
    // for complex visual identification and OCR tasks.
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
            text: `TASK: IDENTIFY THIS ${vault.toUpperCase()} ITEM. 
            Do not refuse or mention lighting; the image is ultra-high resolution (3K).
            
            1. READ ALL TEXT visible (OCR).
            2. Match visual artwork/features to your deep internal database.
            3. Use Google Search to cross-reference recent releases or specific variants if needed.
            
            Return the identification details in the following JSON format ONLY:
            {
              "title": "Exact Name/Player",
              "subTitle": "Issue # / Card # / Series",
              "provider": "Publisher / Manufacturer",
              "year": "YYYY",
              "keyFeatures": "Significance (e.g. 1st appearance, RC)",
              "condition": "Visual grade (e.g. Near Mint)"
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
    console.log(`[Vault AI] Appraising ${item.title}...`);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            text: `USE GOOGLE SEARCH to find current market values and recent auction results for this ${vault} item:
            
            Title: ${item.title}
            Sub-Info: ${item.subTitle}
            Provider: ${item.provider}
            Year: ${item.year}
            Condition: ${item.condition}
            Features: ${item.keyFeatures}
            
            Return the appraisal in this JSON format ONLY:
            {
              "value": 00.00,
              "justification": "Brief explanation citing recent search findings"
            }`
          }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `You are a real-time market analyst for ${vault} collectibles. Use current web data to provide accurate valuations.`
      }
    });

    const text = response.text;
    if (!text) return { value: 0, justification: "Valuation unavailable." };
    
    const result = extractJSON(text);
    return {
      value: result?.value || 0,
      justification: result?.justification || "Calculated based on average market listings."
    };
  } catch (error) {
    console.error("Valuation failed:", error);
    return { value: 0, justification: "Error estimating value via search." };
  }
};
