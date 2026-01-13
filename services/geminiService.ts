import { GoogleGenAI } from "@google/genai";

// Initialize the client. 
// NOTE: We assume process.env.API_KEY is available in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates an image based on a text prompt using the Gemini 2.5 Flash Image model.
 */
export const generateAIArt = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      // No config needed for standard generation, defaults are fine.
    });

    // Iterate through parts to find the image data.
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                const base64EncodeString = part.inlineData.data;
                // Determine mimeType, default to png if not present, though API usually returns jpeg or png
                const mimeType = part.inlineData.mimeType || 'image/png';
                return `data:${mimeType};base64,${base64EncodeString}`;
            }
        }
    }
    
    console.warn("No image data found in response");
    return null;

  } catch (error) {
    console.error("Error generating AI art:", error);
    throw error;
  }
};