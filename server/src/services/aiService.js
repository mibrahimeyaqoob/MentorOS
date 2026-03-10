import { GoogleGenAI, Type } from "@google/genai";
import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import pRetry from "p-retry";

// ============================================================================
// 1. THE MULTI-PROVIDER AI ROUTER
// ============================================================================
const callAI = async (
    engineConfig,
    prompt,
    systemInstruction = null,
    responseSchema = null,
    files = [],
) => {
    const provider = engineConfig.provider || "google";
    const modelId = engineConfig.model;

    console.log(
        `[AI Router] Routing task to ${provider.toUpperCase()} model: ${modelId}`,
    );

    if (provider === "google") {
        const ai = new GoogleGenAI({
            vertexai: true,
            project: process.env.GOOGLE_CLOUD_PROJECT,
            location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
        });

        const parts = [{ text: prompt }];
        if (files.length > 0) parts.unshift(...files);

        const config = { thinkingConfig: { thinkingLevel: "HIGH" } };
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (responseSchema) {
            config.responseMimeType = "application/json";
            config.responseSchema = responseSchema;
        }

        const response = await ai.models.generateContent({
            model: modelId,
            contents: [{ role: "user", parts }],
            config,
        });

        return { text: response.text, usage: response.usageMetadata };
    } else if (provider === "anthropic") {
        const client = new AnthropicVertex({
            projectId: process.env.GOOGLE_CLOUD_PROJECT,
            region: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
        });

        let finalSystem =
            systemInstruction || "You are a helpful AI assistant.";
        if (responseSchema) {
            finalSystem += `\n\nYou MUST return your response as valid JSON matching this schema: ${JSON.stringify(responseSchema)}`;
        }

        const response = await client.messages.create({
            model: modelId,
            max_tokens: 8192,
            system: finalSystem,
            messages: [{ role: "user", content: prompt }],
        });

        return { text: response.content[0].text, usage: response.usage };
    }

    throw new Error(`Unsupported AI Provider: ${provider}`);
};

// ============================================================================
// 2. DYNAMIC YOUTUBE SEARCHER
// ============================================================================
const findSupplementaryVideo = async (searchQuery, searcherConfig) => {
    const ai = new GoogleGenAI({
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT,
        location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
    });

    const response = await ai.models.generateContent({
        model: searcherConfig?.model || "gemini-3.1-pro-preview",
        contents: `Find the best YouTube tutorial for: "${searchQuery}". Return ONLY the raw YouTube URL.`,
        config: { tools: [{ googleSearch: {} }], temperature: 0.1 },
    });
    return response.text.trim();
};

// ============================================================================
// 3. GENERATE BLUEPRINT (THE ARCHITECT)
// ============================================================================
export const generateCourseBlueprint = async (
    topic,
    audience,
    routingConfig,
    youtubeUrl,
    fileUploads,
) => {
    const architectConfig = routingConfig.architect || {
        model: "gemini-3.1-pro-preview",
        provider: "google",
    };
    const searcherConfig = routingConfig.searcher || {
        model: "gemini-3.1-pro-preview",
        provider: "google",
    };

    const files = [];
    if (youtubeUrl)
        files.push({
            fileData: { fileUri: youtubeUrl, mimeType: "video/mp4" },
        });
    for (const file of fileUploads) {
        files.push({
            inlineData: {
                data: file.buffer.toString("base64"),
                mimeType: file.mimetype,
            },
        });
    }

    const prompt = `
    Topic: ${topic}
    Audience: ${audience}

    STRICT STRUCTURAL RULES:
    1. Module 1 MUST be "Introduction & Overview".
    2. Module 2 MUST be "Environment Setup". If not in video, set "needs_search" to true with a "search_query".
    3. Core Content MUST be EXACTLY 1-MINUTE CHUNKS (e.g., 00:00-01:00).
    4. Final module MUST be an "Industrial-Level Capstone Project". If not in video, set "needs_search" to true.
    `;

    const systemInstruction =
        "You are a Senior Curriculum Architect. You must output perfectly valid JSON.";

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
                        needs_search: { type: Type.BOOLEAN },
                        search_query: { type: Type.STRING },
                    },
                    required: ["title", "objective", "needs_search"],
                },
            },
        },
        required: ["title", "modules"],
    };

    const result = await callAI(
        architectConfig,
        prompt,
        systemInstruction,
        responseSchema,
        files,
    );
    let blueprint = JSON.parse(result.text);

    // Dynamic Search Loop for Missing Videos
    for (let i = 0; i < blueprint.modules.length; i++) {
        if (
            blueprint.modules[i].needs_search &&
            blueprint.modules[i].search_query
        ) {
            try {
                const foundUrl = await pRetry(
                    () =>
                        findSupplementaryVideo(
                            blueprint.modules[i].search_query,
                            searcherConfig,
                        ),
                    { retries: 2 },
                );
                blueprint.modules[i].supplementary_url = foundUrl;
                blueprint.modules[i].start_time = "00:00";
                blueprint.modules[i].end_time = "10:00";
                blueprint.modules[i].is_supplementary = true;
            } catch (err) {
                console.error("Search failed.");
            }
        }
    }

    // Append Career Launchpad
    blueprint.modules.push(
        {
            title: "Career: Tech Resume Building",
            objective: "Tailor a resume.",
            is_static: true,
        },
        {
            title: "Career: Interview Prep",
            objective: "Common questions.",
            is_static: true,
        },
    );

    return { blueprint, usage: result.usage };
};

// ============================================================================
// 4. REFINE BLUEPRINT (AI ASSISTED EDITING)
// ============================================================================
export const refineCourseBlueprint = async (
    currentBlueprint,
    prompt,
    architectConfig,
) => {
    const aiPrompt = `
        Here is a course blueprint: ${JSON.stringify(currentBlueprint)}
        The admin requested this change: "${prompt}"
        Apply the change and return the full updated JSON blueprint.
    `;

    const result = await callAI(
        architectConfig,
        aiPrompt,
        "You are a Curriculum Architect. Output ONLY valid JSON.",
        null,
        [],
    );
    return { blueprint: JSON.parse(result.text) };
};

// ============================================================================
// 5. EXTRACT MODULE STEPS
// ============================================================================
export const extractStepsForModule = async (
    moduleTitle,
    blueprint,
    lessonConfig,
    courseId,
    command,
) => {
    const prompt = `Module: "${moduleTitle}". Course Context: ${JSON.stringify(blueprint)}. Refinement: ${command || "Focus on practical UI actions."}`;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                step_type: { type: Type.STRING },
                instruction_text: { type: Type.STRING },
                required_action: { type: Type.STRING },
                success_state: { type: Type.STRING },
                ui_target: {
                    type: Type.OBJECT,
                    properties: { description: { type: Type.STRING } },
                },
            },
            required: ["step_type", "instruction_text"],
        },
    };

    const result = await callAI(
        lessonConfig,
        prompt,
        "You are an AI UI Technical Writer. Output ONLY valid JSON.",
        responseSchema,
        [],
    );
    return { steps: JSON.parse(result.text), usage: result.usage };
};

// ============================================================================
// 6. REFINE MODULE STEPS (AI ASSISTED EDITING)
// ============================================================================
export const refineModuleSteps = async (currentSteps, prompt, lessonConfig) => {
    const aiPrompt = `
        Here are the current UI action steps: ${JSON.stringify(currentSteps)}
        The admin requested this change: "${prompt}"
        Apply the change and return the updated JSON array.
    `;
    const result = await callAI(
        lessonConfig,
        aiPrompt,
        "You are an AI UI Technical Writer. Output ONLY valid JSON.",
        null,
        [],
    );
    return { steps: JSON.parse(result.text) };
};

// ============================================================================
// 7. GENERATE VECTOR EMBEDDINGS
// ============================================================================
export const generateEmbeddings = async (text, embedderConfig) => {
    const provider = embedderConfig.provider || "google";

    if (provider === "google") {
        const ai = new GoogleGenAI({
            vertexai: true,
            project: process.env.GOOGLE_CLOUD_PROJECT,
            location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
        });
        const response = await ai.models.embedContent({
            model: embedderConfig.model || "text-embedding-005",
            contents: text,
        });
        return response.embeddings[0].values;
    }
    throw new Error(
        "Only Google models are currently supported for embeddings.",
    );
};
