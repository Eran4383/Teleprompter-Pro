import { GoogleGenAI, Type } from "@google/genai";
import { ScriptSegment } from "../types";

const hydrateSegment = (id: string, text: string, duration: number): ScriptSegment => {
    const wordCount = text.trim().split(/\s+/).length;
    const minDuration = Math.max(1000, wordCount * 250); 
    
    return {
        id,
        text,
        words: text.split(' ').map(w => ({ text: w })),
        duration: Math.max(minDuration, duration)
    };
};

export const optimizeScript = async (text: string): Promise<ScriptSegment[]> => {
    // יצירת המופע רק בזמן הקריאה כדי להבטיח שה-API_KEY זמין ולא יקריס את האפליקציה בטעינה
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `You are an expert teleprompter technician. Your goal is to break text into readable segments and assign PRECISE timing.
            
            INSTRUCTIONS:
            1.  **Segmentation**: Break the text into short, natural phrases (max 5-10 words per line).
            2.  **Timing Algorithm**:
                - Add 350ms for every word.
                - Add +500ms for every comma (,) or dash (-).
                - Add +1200ms for every period (.), question mark (?), or exclamation point (!).
                - Minimum 2000ms per segment.
            
            Input Text:
            "${text}"`,
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
            hydrateSegment(`gen-${Date.now()}-${index}`, item.text, item.duration)
        );
    } catch (error) {
        console.error("Failed to optimize script:", error);
        throw error;
    }
};

export const generateScriptFromTopic = async (topic: string): Promise<ScriptSegment[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Write a short, professional video script about: "${topic}". Return a JSON array of segments.`,
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