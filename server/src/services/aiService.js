import { GoogleGenAI, Type } from "@google/genai";

// 🚀 PRODUCTION AUTHENTICATION: Uses GOOGLE_APPLICATION_CREDENTIALS
const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
});

// 1. Generate Blueprint with Context (YouTube + Files)
export const generateCourseBlueprint = async (
    topic,
    audience,
    engineConfig,
    youtubeUrl,
    files,
) => {
    const parts = [];

    // Add YouTube Video if provided
    if (youtubeUrl && youtubeUrl.trim() !== "") {
        parts.push({
            fileData: { fileUri: youtubeUrl, mimeType: "video/mp4" },
        });
    }

    // Add Context Files (PDFs, TXT, etc)
    for (const file of files) {
        parts.push({
            inlineData: {
                data: file.buffer.toString("base64"),
                mimeType: file.mimetype,
            },
        });
    }

    parts.push({
        text: `
        Role: Senior Curriculum Architect.
        Task: Create a structured course blueprint.
        Topic: ${topic}
        Audience: ${audience}

        Instructions:
        1. Analyze the attached video and documents.
        2. Break the content down into chronological modules.
        3. STRICT RULE: Each module MUST represent roughly a 2-minute chunk of time (e.g., 00:00 - 02:00, 02:00 - 04:00).
        4. Extract the core objective of what the instructor is doing in that 2-minute chunk.
        `,
    });

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            modules: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        start_time: { type: Type.STRING },
                        end_time: { type: Type.STRING },
                        title: { type: Type.STRING },
                        objective: { type: Type.STRING },
                    },
                    required: ["start_time", "end_time", "title", "objective"],
                },
            },
        },
        required: ["title", "modules"],
    };

    const response = await ai.models.generateContent({
        model: engineConfig.model || "gemini-3.1-pro-preview",
        contents: [{ role: "user", parts: parts }],
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            thinkingConfig: { thinkingLevel: "HIGH" },
        },
    });

    return {
        blueprint: JSON.parse(response.text),
        usage: response.usageMetadata,
    };
};

// 2. Refine Blueprint (AI Assisted Editing)
export const refineCourseBlueprint = async (
    currentBlueprint,
    prompt,
    engineConfig,
) => {
    const response = await ai.models.generateContent({
        model: engineConfig.model || "gemini-3.1-pro-preview",
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: `
            Here is a course blueprint: ${JSON.stringify(currentBlueprint)}
            The admin requested this change: "${prompt}"
            Apply the change and return the full updated JSON blueprint in the exact same schema structure.
        `,
                    },
                ],
            },
        ],
        config: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingLevel: "LOW" },
        },
    });
    return { blueprint: JSON.parse(response.text) };
};

// 3. Extract Module Steps
export const extractStepsForModule = async (
    moduleTitle,
    blueprint,
    engineConfig,
    courseId,
    command,
) => {
    const prompt = `
    Role: AI Tutor & Technical Writer.
    Task: Generate an interactive UI lesson map for the module: "${moduleTitle}".
    Course Context: ${JSON.stringify(blueprint)}
    Refinement Command: ${command || "Focus on practical UI actions."}
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
        model: engineConfig.model || "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });

    return { steps: JSON.parse(response.text), usage: response.usageMetadata };
};

// 4. Refine Extracted Steps (AI Assisted Editing)
export const refineModuleSteps = async (currentSteps, prompt, engineConfig) => {
    const response = await ai.models.generateContent({
        model: engineConfig.model || "gemini-3-flash-preview",
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: `
            Here are the current UI action steps: ${JSON.stringify(currentSteps)}
            The admin requested this change: "${prompt}"
            Apply the change and return the updated JSON array. Keep the same schema.
        `,
                    },
                ],
            },
        ],
        config: { responseMimeType: "application/json" },
    });
    return { steps: JSON.parse(response.text) };
};
