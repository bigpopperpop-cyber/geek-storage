import { GoogleGenAI, Type } from "@google/genai";
import { CollectionItem, VaultType } from "../types";

const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not configured");
  return new GoogleGenAI({ apiKey });
};

const contextMap = {
  comics: "professional comic book historian and grader. Focus on identifying Title, Issue Number, and key significance like '1st appearance of X', 'Death of X', or 'Origin story'.",
  sports: "sports card expert and authenticator. Focus on identifying Player Name, Set Name (e.g. Prizm, Upper Deck), Card Number, and critical labels like 'Rookie Card' or 'RC'.",
  fantasy: "TCG/CCG master collector for Magic, Pokemon, and Yu-Gi-Oh. Focus on identifying Card Name, Set (e.g. Base Set, Alpha), Edition (1st Edition vs Unlimited), and rarity (Holo, Ghost Rare).",
  coins: "expert numismatist. Focus on identifying Denomination, Year, Mint Mark, and specific varieties (e.g. 'Double Die', 'VDB')."
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
            text: `You are a ${contextMap[vault]}. 
            INSTRUCTIONS:
            1. Read all visible text in the image carefully (OCR).
            2. Identify the specific item for a high-end collection database.
            3. LOOK FOR KEY SIGNIFICANCE: Specifically check for labels or text indicating: "Rookie Card", "RC", "1st Appearance", "Special Edition", "Variant", "Key Issue", "Holographic", "1st Edition", or "Error".
            
            REQUIRED FIELDS:
            - title: The main name or player.
            - subTitle: The issue number, card number, or denomination.
            - provider: The company that made it (e.g., Marvel, DC, Topps, Panini, Wizards of the Coast, US Mint).
            - year: The production or minting year.
            - keyFeatures: Describe the significance (e.g., "1st Appearance of Spider-Man", "Rookie Card", "Rare Mint Mark"). If it is a common item, leave blank.
            - condition: Based on visible wear (corners, edges, surface), suggest a collector grade.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subTitle: { type: Type.STRING },
            provider: { type: Type.STRING },
            year: { type: Type.STRING },
            keyFeatures: { type: Type.STRING },
            condition: { type: Type.STRING }
          },
          required: ["title", "subTitle", "provider", "year"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
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
            text: `Act as a professional market analyst for ${contextMap[vault]}. Assess the current fair market value (USD) for this item:
            
            Category: ${vault}
            Name: ${item.title}
            Detail: ${item.subTitle}
            Manufacturer: ${item.provider}
            Year: ${item.year}
            Key Features: ${item.keyFeatures}
            Condition: ${item.condition}
            
            Consider recent auction sales and current scarcity.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            value: {
              type: Type.NUMBER,
              description: "The estimated market value in USD.",
            },
            justification: {
              type: Type.STRING,
              description: "A professional explanation for this specific value.",
            },
          },
          required: ["value", "justification"],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    return {
      value: result.value || 0,
      justification: result.justification || "No justification provided."
    };
  } catch (error) {
    console.error("Valuation failed:", error);
    return { value: 0, justification: "Error during valuation. Please check your connection." };
  }
};