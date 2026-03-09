import { GoogleGenAI, Type, Modality } from "@google/genai";

export interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  correctAnswer: 'A' | 'B';
}

export async function generateQuestions(topic: string, count: number = 10): Promise<Question[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate ${count} trivia questions about "${topic}". Each question must have exactly two options (A and B) and a correct answer. Ensure the questions are accurate and use the googleSearch tool to verify facts if needed.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The question text" },
            optionA: { type: Type.STRING, description: "Option A" },
            optionB: { type: Type.STRING, description: "Option B" },
            correctAnswer: { type: Type.STRING, description: "The correct answer, either 'A' or 'B'" }
          },
          required: ["text", "optionA", "optionB", "correctAnswer"]
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text || "[]");
    return data.map((q: any, i: number) => ({
      ...q,
      id: `q-${i}-${Date.now()}`
    }));
  } catch (e) {
    console.error("Failed to parse questions", e);
    return [];
  }
}

export async function generateSpeech(text: string): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/pcm;rate=24000;base64,${base64Audio}`;
    }
  } catch (e) {
    console.error("Failed to generate speech", e);
  }
  return null;
}
