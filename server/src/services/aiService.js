import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "../config/db.js";

// 🚀 PRODUCTION AUTHENTICATION:
// The SDK automatically uses the GOOGLE_APPLICATION_CREDENTIALS environment variable.
// No more passing API keys manually!
const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
});

// 1. YouTube Metadata (Native URL passing)
export const fetchYoutubeContext = async (url) => {
    return { url: url };
};

// 2. Blueprint Generation (Direct YouTube Processing)
export const generateCourseBlueprint = async (
    topic,
    audience,
    engineConfig,
    sources,
) => {
    const parts = [];
    for (const source of sources) {
        if (source.type === "youtube") {
            parts.push({
                fileData: {
                    fileUri: source.url,
                    mimeType: "video/mp4",
                },
            });
        }
    }

    parts.push({
        text: `
        Role: Senior Curriculum Architect.
        Task: Create a structured course blueprint from the provided video.
        Topic: ${topic}
        Audience: ${audience}

        Instructions:
        1. Watch the attached YouTube video.
        2. Break the video down into chronological modules.
        3. Each module MUST be roughly 2-minutes long.
        4. Extract the core objective of what the instructor is doing in that chunk.
        `,
    });

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: {
                type: Type.STRING,
                description: "The overarching title of the course",
            },
            modules: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        start_time: {
                            type: Type.STRING,
                            description: "e.g., 00:00",
                        },
                        end_time: {
                            type: Type.STRING,
                            description: "e.g., 02:00",
                        },
                        title: {
                            type: Type.STRING,
                            description: "Module Title",
                        },
                        objective: {
                            type: Type.STRING,
                            description: "What the user will learn to do",
                        },
                    },
                    required: ["start_time", "end_time", "title", "objective"],
                },
            },
        },
        required: ["title", "modules"],
    };

    const response = await ai.models.generateContent({
        // Uses the model selected in the UI frontend routing matrix, defaults to Pro
        model: engineConfig.model || "gemini-3.1-pro-preview",
        contents: [{ role: "user", parts: parts }],
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            thinkingConfig: { thinkingLevel: "HIGH" },
        },
    });

    const blueprint = JSON.parse(response.text);
    return { blueprint, usage: response.usageMetadata };
};

// 3. Step Extraction (Action Map generation)
export const extractStepsForModule = async (
    moduleTitle,
    blueprint,
    engineConfig,
    courseId,
    command,
) => {
    const prompt = `
    Role: AI Tutor & Technical Writer.
    Task: Generate a step-by-step interactive UI lesson for the module: "${moduleTitle}".
    Course Context: ${JSON.stringify(blueprint)}
    Refinement Command: ${command || "Focus on practical UI actions."}

    Generate an array of steps. For actions, describe the target UI element vividly so a Computer Vision model can find it on screen later.
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                step_type: {
                    type: Type.STRING,
                    enum: ["action_trigger", "dialogue"],
                },
                instruction_text: { type: Type.STRING },
                required_action: {
                    type: Type.STRING,
                    enum: [
                        "left_click",
                        "double_click",
                        "type_text",
                        "drag_and_drop",
                        "none",
                    ],
                },
                ui_target: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        label: { type: Type.STRING },
                    },
                },
                success_state: { type: Type.STRING },
            },
            required: ["step_type", "instruction_text"],
        },
    };

    const response = await ai.models.generateContent({
        // Flash is faster for extracting steps
        model: engineConfig.model || "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });

    const steps = JSON.parse(response.text);
    return { steps, usage: response.usageMetadata };
};

// 4. Vector Ingestion (Embedding)
export const generateEmbeddings = async (text, engineConfig) => {
    const response = await ai.models.embedContent({
        // Latest Vertex AI embedding model
        model: engineConfig.model || "text-embedding-005",
        contents: text,
    });

    return response.embeddings[0].values;
};
