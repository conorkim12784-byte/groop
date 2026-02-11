
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const checkIsToxic = async (message: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: `Analyze for toxicity in Egyptian Arabic. Respond in JSON.`,
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
        systemInstruction: "You are Guardia AI. A professional Telegram moderator. Respond concisely in Arabic/Egyptian.",
      }
    });
    return response.text || "أنا هنا لحمايتكم.";
  } catch (error) {
    return "عذراً، واجهت مشكلة تقنية بسيطة.";
  }
};
