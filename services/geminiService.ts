
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getMilestoneMessage = async (level: number) => {
  // Directly return the requested strings as per user instructions
  if (level === 10) return "niveau Kichta atteint";
  if (level === 20) return "vous avez débloquer le niveau PUCCI";

  try {
    const prompt = `Generate a very short hype message for level ${level} in a snake game.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || `NIVEAU ${level} !`;
  } catch (error) {
    return `NIVEAU ${level} !`;
  }
};
