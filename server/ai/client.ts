import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '../config';

export const apiKey = GEMINI_API_KEY;

let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI with key:', err);
  }
}

export { aiClient };

export async function generateAIResponse(prompt: string, fallbackGenerator: () => any) {
  if (aiClient && apiKey) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      });
      const text = response.text?.trim() || '';
      if (text) {
        return { ...JSON.parse(text), isFallback: false };
      }
    } catch (error) {
      console.warn('Gemini API call failed or returned non-JSON, using structured fallback:', error);
    }
  }
  return { ...fallbackGenerator(), isFallback: true };
}
