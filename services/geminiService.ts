
import { GoogleGenAI, Type } from "@google/genai";
import { CollectionItem, VaultType } from "../types";

const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not configured");
  return new GoogleGenAI({ apiKey });
};

const contextMap = {
  comics: "You are a world-class comic book historian and professional grader. You specialize in identifying Titles, Issue Numbers, Publishers, and Key Significances (like 1st appearances) from photos of comic book covers.",
  sports: "You are a premier sports card expert and authenticator. You specialize in identifying Player Names, Card Sets (Prizm, Topps), Card Numbers, and Rookie Card (RC) designations from photos of cards.",
  fantasy: "You are a master TCG collector (Magic, Pokemon, Yu-Gi-Oh). You specialize in identifying Card Names, Sets, Editions (1st Edition vs Unlimited), and rarity from photos of cards.",
  coins: "You are an expert numismatist. You specialize in identifying Coin Denominations, Years, Mint Marks, and rare varieties from photos of coins."
};

export const identifyItemFromImage = async (base64Data: string, vault: VaultType) => {
  try {
    const ai = getAIInstance();
    const mimeType = base64Data.split(';')[0].split(':')[1];
    const base64Content = base64Data.split(',')[1];

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
            text: `TASK: Perform high-accuracy OCR and identify the item in this photo for my collection database.
            
            DIRECTIONS:
            1. Look at the top, bottom, and corners for text.
            2. Extract the Name/Title, Number/Issue, Year, and Company/Provider.
            3. Check for special markings like "1st Appearance", "Rookie Card", "Variant", "Holographic", or "1st Edition".
            4. Suggest a collector grade (Condition) based on any visible corner or surface wear.
            
            Return ONLY the JSON object defined in the schema.`
          }
        ]
      },
      config: {
        systemInstruction: contextMap[vault],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "The main name of the item or player" },
            subTitle: { type: Type.STRING, description: "The issue number, card number, or specific variety" },
            provider: { type: Type.STRING, description: "The manufacturer or publisher" },
            year: { type: Type.STRING, description: "The production year" },
            keyFeatures: { type: Type.STRING, description: "Significance: e.g. '1st Appearance of Venom' or 'RC'" },
            condition: { type: Type.STRING, description: "Suggested collector grade" }
          },
          required: ["title", "subTitle", "provider", "year"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
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
            text: `Appraise this ${vault} item. 
            Name: ${item.title}
            Detail: ${item.subTitle}
            Provider: ${item.provider}
            Year: ${item.year}
            Keys: ${item.keyFeatures}
            Condition: ${item.condition}
            
            Return the current estimated market value in USD and a brief explanation.`
          }
        ]
      },
      config: {
        systemInstruction: `You are a market analyst for ${vault} collectibles. Use recent auction data to provide accurate valuations.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.NUMBER },
            justification: { type: Type.STRING }
          },
          required: ["value", "justification"]
        }
      }
    });

    const text = response.text;
    if (!text) return { value: 0, justification: "AI could not generate a valuation." };
    const result = JSON.parse(text);
    return {
      value: result.value || 0,
      justification: result.justification || "No justification provided."
    };
  } catch (error) {
    console.error("Valuation failed:", error);
    return { value: 0, justification: "Error during valuation. Please try again." };
  }
};
