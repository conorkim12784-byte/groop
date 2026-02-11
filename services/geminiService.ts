
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * تحليل المحتوى للبحث عن آيات أو أحاديث أو تفسير
 */
export const smartSearch = async (query: string, type: 'quran' | 'hadith' | 'tafser') => {
  const prompts = {
    quran: "ابحث عن الآية واذكر السورة والجزء.",
    hadith: "ابحث عن الحديث واذكر المصدر وصحة الحديث.",
    tafser: "اشرح معنى الآية أو النص الديني المذكور باختصار."
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${prompts[type]} النص: "${query}"`,
      config: {
        systemInstruction: "أنت خبير في العلوم الإسلامية والقرآن الكريم والأحاديث النبوية. ردودك دقيقة وموثقة."
      }
    });
    return response.text;
  } catch (error) {
    return "عذراً، لم أتمكن من العثور على نتائج حالياً.";
  }
};

export const checkIsToxic = async (message: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `هل هذا النص مسيء؟: "${message}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isToxic: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["isToxic", "reason"]
        }
      }
    });
    return JSON.parse(response.text || '{"isToxic": false, "reason": ""}');
  } catch (error) {
    return { isToxic: false, reason: "" };
  }
};

export const getAIResponse = async (message: string, mode: 'formal' | 'funny' | 'smart' = 'smart') => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: `أنت بوت سيلا. الوضع: ${mode}. ردودك باللهجة المصرية المحببة إذا كان الوضع هزار.`,
      }
    });
    return response.text;
  } catch (error) {
    return "أنا هنا لخدمتك!";
  }
};
