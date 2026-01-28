
import { GoogleGenAI, Type } from "@google/genai";
import { ScriptSegment } from "../types";

const hydrateSegment = (id: string, text: string, duration: number): ScriptSegment => {
    // Safety fallback: Ensure duration is at least reasonable for the word count
    const wordCount = text.trim().split(/\s+/).length;
    const minDuration = Math.max(1000, wordCount * 250); 
    
    return {
        id,
        text,
        words: text.split(' ').map(w => ({ text: w })),
        duration: Math.max(minDuration, duration)
    };
};

/**
 * Optimizes a script by breaking it into segments and assigning durations.
 * Uses 'gemini-3-pro-preview' for complex text tasks.
 */
export const optimizeScript = async (text: string): Promise<ScriptSegment[]> => {
    try {
        // ALWAYS use process.env.API_KEY and initialize inside the function
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `You are an expert teleprompter technician. Your goal is to break text into readable segments and assign PRECISE timing.
            
            INSTRUCTIONS:
            1.  **Segmentation**: Break the text into short, natural phrases (max 5-10 words per line). Never break a sentence in an awkward place.
            2.  **Timing Algorithm**: You MUST calculate 'duration' using this formula:
                -   Start with 0ms.
                -   Add **350ms** for every word.
                -   Add **+500ms** for every comma (,) or dash (-).
                -   Add **+1200ms** for every period (.), question mark (?), or exclamation point (!).
                -   Minimum duration for any segment is **2000ms** (even for single words).
            
            Input Text:
            "${text}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING, description: "The segment text" },
                            duration: { type: Type.INTEGER, description: "Duration in milliseconds calculated using the formula" }
                        },
                        required: ["text", "duration"]
                    }
                }
            }
        });

        const rawData = JSON.parse(response.text || "[]");
        
        return rawData.map((item: any, index: number) => 
            hydrateSegment(`gen-${Date.now()}-${index}`, item.text, item.duration)
        );

    } catch (error) {
        console.error("Failed to optimize script:", error);
        throw error;
    }
};

/**
 * Generates a script from a topic using Gemini 3 Pro.
 */
export const generateScriptFromTopic = async (topic: string): Promise<ScriptSegment[]> => {
    try {
        // ALWAYS use process.env.API_KEY and initialize inside the function
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Write a short, professional video script about: "${topic}".
            
            OUTPUT REQUIREMENTS:
            1.  **Style**: Conversational, engaging, simple English.
            2.  **Length**: Approx 100-150 words.
            3.  **Format**: Return a JSON array of segments.
            4.  **Timing**: logical duration in milliseconds (approx 350ms per word + 1000ms for end of sentences). Minimum 2000ms per segment.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            duration: { type: Type.INTEGER }
                        },
                        required: ["text", "duration"]
                    }
                }
            }
        });

        const rawData = JSON.parse(response.text || "[]");
        return rawData.map((item: any, index: number) => 
            hydrateSegment(`gen-topic-${Date.now()}-${index}`, item.text, item.duration)
        );
    } catch (error) {
        console.error("Failed to generate script:", error);
        throw error;
    }
};
