import { GoogleGenAI, Type } from "@google/genai";
import { CollectionItem, VaultType } from "../types";

const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not configured");
  return new GoogleGenAI({ apiKey });
};

const contextMap = {
  comics: "comic book expert identifying titles, issue numbers, publishers, and years.",
  sports: "sports card expert identifying players, sets, card numbers, manufacturers, and years.",
  fantasy: "TCG/CCG expert identifying card names, sets, editions (First/Unlimited), and manufacturers.",
  coins: "numismatic expert identifying denominations, mint marks, varieties, and years."
};

export const identifyItemFromImage = async (base64Data: string, vault: VaultType) => {
  try {
    const ai = getAIInstance();
    const mimeType = base64Data.split(';')[0].split(':')[1];
    const base64Content = base64Data.split(',')[1];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Content
          }
        },
        {
          text: `Act as a ${contextMap[vault]}. Look at this image and identify the following details for a collection database.
          Fields needed:
          - title: (e.g. The Amazing Spider-Man, Michael Jordan, Charizard, Walking Liberty)
          - subTitle: (e.g. Issue #300, 1986 Fleer #57, Base Set Holo, Half Dollar)
          - provider: (e.g. Marvel, Fleer, Wizards of the Coast, US Mint)
          - year: (e.g. 1988, 1941)
          - condition: Suggest a grade based on visual quality (e.g. Near Mint, Very Fine).`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subTitle: { type: Type.STRING },
            provider: { type: Type.STRING },
            year: { type: Type.STRING },
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
      contents: `Act as a professional ${contextMap[vault]}. Assess the current market value (USD) for:
      Category: ${vault}
      Name/Title/Denomination: ${item.title}
      Issue/Set/Player/Mint Mark: ${item.subTitle}
      Publisher/Manufacturer/Grading: ${item.provider}
      Year: ${item.year}
      Condition: ${item.condition}
      Notes: ${item.notes}`,
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
              description: "A short professional explanation for this valuation based on current market trends and rarity.",
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
    return { value: 0, justification: "Error during valuation. Please check your API key and connection." };
  }
};