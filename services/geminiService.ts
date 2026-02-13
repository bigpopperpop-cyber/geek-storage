
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
    const mimePart = base64Data.split(';')[0];
    const mimeType = mimePart.split(':')[1] || 'image/jpeg';
    const base64Content = base64Data.split(',')[1];

    console.log(`Attempting to identify ${vault} item using Gemini 3 Pro...`);

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
            text: `IDENTIFY THIS ITEM.
            
            1. READ ALL TEXT visible (OCR).
            2. USE VISUAL KNOWLEDGE: If this is a famous comic (e.g. Amazing Fantasy #15) or a famous card (e.g. 1952 Mickey Mantle), identify it even if the text is hard to read.
            3. LOOK FOR KEY DETAILS: 
               - Comics: Title, Issue #, Publisher, Key Appearance info.
               - Sports Cards: Player, Set Name, Year, Card #, RC logo.
               - TCG: Card Name, Set Name/Symbol, Rarity, Edition.
            
            Return a JSON object. If you aren't 100% sure about a field like 'year', make your best guess based on the item type.`
          }
        ]
      },
      config: {
        systemInstruction: contextMap[vault],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Main name or player name" },
            subTitle: { type: Type.STRING, description: "Issue number or card number" },
            provider: { type: Type.STRING, description: "Publisher or Manufacturer" },
            year: { type: Type.STRING, description: "Production year" },
            keyFeatures: { type: Type.STRING, description: "Why is it special? (e.g. 1st Appearance, Rookie Card)" },
            condition: { type: Type.STRING, description: "Visual condition estimate" }
          },
          required: ["title"] // Only Title is strictly required to avoid failing on missing minor details
        }
      }
    });

    const text = response.text;
    console.debug("AI Response Text:", text);
    
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
            text: `Appraise this ${vault} item based on current market trends.
            
            Title: ${item.title}
            Sub: ${item.subTitle}
            Provider: ${item.provider}
            Year: ${item.year}
            Key Features: ${item.keyFeatures}
            Condition: ${item.condition}
            
            Provide a realistic USD value and a professional justification.`
          }
        ]
      },
      config: {
        systemInstruction: `You are a professional market analyst for ${vault} collectibles. Use your knowledge of recent auction results.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.NUMBER, description: "Estimated USD value" },
            justification: { type: Type.STRING, description: "Reasoning for the price" }
          },
          required: ["value", "justification"]
        }
      }
    });

    const text = response.text;
    if (!text) return { value: 0, justification: "Valuation unavailable." };
    const result = JSON.parse(text);
    return {
      value: result.value || 0,
      justification: result.justification || "Calculated based on average market listings."
    };
  } catch (error) {
    console.error("Valuation failed:", error);
    return { value: 0, justification: "Error estimating value." };
  }
};
