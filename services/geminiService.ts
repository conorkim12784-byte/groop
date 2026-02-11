
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAIResponse = async (userMessage: string, context: string = "") => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context: You are a helpful Telegram Protection Bot named Guardia AI. You protect a group from spam and help users.
      Previous chat history or context: ${context}
      User Message: ${userMessage}
      Instructions: Respond in Arabic. Be friendly but professional. Keep it concise.`,
      config: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });

    return response.text || "عذراً، لم أتمكن من معالجة طلبك حالياً.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "حدث خطأ في الاتصال بالذكاء الاصطناعي.";
  }
};

export const checkIsToxic = async (message: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze if this message is toxic, contains spam, or violates typical group rules (insults, links, etc). Return ONLY a JSON object: {"isToxic": boolean, "reason": string}.
      Message: "${message}"`,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    const result = JSON.parse(response.text || '{"isToxic": false}');
    return result;
  } catch (error) {
    return { isToxic: false, reason: "" };
  }
};
