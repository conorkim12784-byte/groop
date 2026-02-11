
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const checkIsToxic = async (message: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: `You are an expert moderator specialized in Egyptian Arabic. 
        Detect toxicity including:
        - Common Egyptian family insults.
        - Sexual slang (innuendos).
        - Aggressive street bullying.
        Respond in JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isToxic: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
            severity: { type: Type.STRING }
          },
          required: ["isToxic", "reason", "severity"]
        }
      }
    });
    return JSON.parse(response.text || '{"isToxic": false}');
  } catch (error) {
    return { isToxic: false, reason: "Error", severity: "low" };
  }
};

export const getAIResponse = async (message: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: "You are Guardia AI. A professional, smart Telegram moderator. Respond in Arabic (Egyptian flavor). Mention the developer MoSalem if asked.",
      }
    });
    return response.text || "أنا هنا لحمايتكم.";
  } catch (error) {
    return "عذراً، أنا مشغول حالياً بحماية المجموعة.";
  }
};
