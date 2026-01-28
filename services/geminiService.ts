
import { GoogleGenAI, Type } from "@google/genai";
import { CollectionItem, VaultType } from "../types";

export const assessItemValue = async (item: Partial<CollectionItem>, vault: VaultType): Promise<{ value: number; justification: string }> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return { 
      value: 0, 
      justification: "API Key not configured. Please add API_KEY to your environment variables." 
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const contextMap = {
    comics: "comic book appraiser focusing on CGC/CBCS standards and recent Heritage Auctions data.",
    sports: "sports card expert specializing in PSA/SGC/BGS grading and recent eBay/Goldin sales for rookie cards and parallels.",
    fantasy: "TCG specialist for Magic: The Gathering, Pokémon, and Yu-Gi-Oh, focusing on TCGPlayer market prices and card rarity.",
    coins: "professional numismatic expert focusing on PCGS/NGC grading standards, mintage figures, and recent auction results from Heritage Auctions and Stacks Bowers."
  };

  try {
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
