
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const checkIsToxic = async (message: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `حلل النص التالي بدقة: "${message}". هل يحتوي على سباب، إهانة، محتوى إباحي، أو تحرش؟
      رد بتنسيق JSON فقط:
      {
        "isToxic": boolean,
        "reason": string (سبب التصنيف بالعربي),
        "severity": number (1-10)
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isToxic: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
            severity: { type: Type.NUMBER }
          },
          required: ["isToxic", "reason", "severity"]
        }
      }
    });
    return JSON.parse(response.text || '{"isToxic": false, "reason": "", "severity": 0}');
  } catch (error) {
    return { isToxic: false, reason: "", severity: 0 };
  }
};

export const getAIResponse = async (message: string, mode: 'formal' | 'funny' | 'smart' = 'smart') => {
  const instructions = {
    formal: "أنت 'سيلا'، بوت حماية رسمي جداً. ردودك بالفصحى، جادة، ومنظمة.",
    funny: "أنت 'سيلا'، بوت 'هزار' مصري أصلي. ردودك بالعامية المصرية، مليئة بالقفشات والأمثال، وتتعامل مع الأعضاء كأنك صاحبهم في القهوة.",
    smart: "أنت 'سيلا'، مساعد ذكي وتقني. ردودك دقيقة، مختبرة، ومختصرة جداً."
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: `${instructions[mode]} مطورك هو أحمد. لا تخرج عن نطاق تخصصك كبوت حماية.`,
      }
    });
    return response.text || "أنا هنا لحماية مجموعتك!";
  } catch (error) {
    return "عذراً، يبدو أن هناك ضغطاً كبيراً على معالجي حالياً!";
  }
};

export const generateAIGame = async () => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate a random, creative Arabic challenge for a group (Truth, Dare, or Logic Puzzle). Output valid JSON.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            answer: { type: Type.STRING },
            category: { type: Type.STRING, description: "لغز، صراحة، تحدي ذكاء" }
          },
          required: ["question", "options", "answer", "category"]
        }
      }
    });
    return JSON.parse(response.text || 'null');
  } catch (error) {
    return null;
  }
};
