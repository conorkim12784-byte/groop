
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Google GenAI SDK with the API key from environment variables.
// Always use the named parameter object.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Analyze the message for toxicity using a schema-driven JSON response.
// This handles the Egyptian Arabic dialect specific context.
export const checkIsToxic = async (message: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: `You are an expert in Egyptian Arabic dialects and slang. 
        Analyze the following message for:
        1. Hard insults (سب وقذف)
        2. Sexual innuendos (إيحاءات)
        3. Street slang used for bullying (بلطجة لفظية)
        4. Typical Egyptian insults (including those involving parents or family).
        
        Return a JSON object indicating if the message is toxic and why.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isToxic: {
              type: Type.BOOLEAN,
            },
            reason: {
              type: Type.STRING,
            },
            severity: {
              type: Type.STRING,
              description: "The severity level of toxicity: low, medium, or high.",
            },
          },
          required: ["isToxic", "reason", "severity"],
        },
      }
    });
    
    // The .text property is used to retrieve the generated string from the response.
    return JSON.parse(response.text || '{"isToxic": false}');
  } catch (error) {
    console.error("Toxicity scan error:", error);
    return { isToxic: false, reason: "" };
  }
};

// Generates an AI-powered conversational response for the chat simulator.
// This fix addresses the 'getAIResponse' not exported error.
export const getAIResponse = async (message: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: "You are Guardia AI, a helpful and friendly moderator for a Telegram group. Respond naturally in Arabic, occasionally using polite Egyptian dialect. Keep your responses concise and informative.",
      }
    });
    // Return the text property directly from the GenerateContentResponse object.
    return response.text || "أنا هنا لمساعدتك وحماية المجموعة.";
  } catch (error) {
    console.error("AI response error:", error);
    return "عذراً، واجهت مشكلة في الرد حالياً. حاول مجدداً لاحقاً.";
  }
};
