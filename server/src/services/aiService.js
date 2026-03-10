import { GoogleGenAI, Type } from '@google/genai';
import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import pRetry from 'p-retry';
import { supabase } from '../config/db.js';

// ============================================================================
// 1. THE MULTI-PROVIDER AI ROUTER
// ============================================================================
const callAI = async (engineConfig, prompt, systemInstruction = null, responseSchema = null, files =[]) => {
    const provider = engineConfig.provider || 'google';
    const modelId = engineConfig.model;

    console.log(`[AI Router] Routing task to ${provider.toUpperCase()} model: ${modelId}`);

    // --- GOOGLE GEMINI VIA VERTEX AI ---
    if (provider === 'google') {
        const ai = new GoogleGenAI({ vertexai: true, project: process.env.GOOGLE_CLOUD_PROJECT, location: process.env.GOOGLE_CLOUD_LOCATION });

        const parts = [{ text: prompt }];
        if (files.length > 0) parts.unshift(...files);

        const config = { thinkingConfig: { thinkingLevel: 'HIGH' } }; // Default config
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (responseSchema) {
            config.responseMimeType = "application/json";
            config.responseSchema = responseSchema;
        }

        const response = await ai.models.generateContent({
            model: modelId,
            contents: [{ role: 'user', parts }],
            config
        });

        return { text: response.text, usage: response.usageMetadata };
    } 

    // --- ANTHROPIC CLAUDE VIA VERTEX AI ---
    else if (provider === 'anthropic') {
        const client = new AnthropicVertex({ projectId: process.env.GOOGLE_CLOUD_PROJECT, region: process.env.GOOGLE_CLOUD_LOCATION });

        // Note: Claude handles JSON structuring via 'tools' or strict prompting. 
        // For this abstraction, we enforce JSON via system prompt if a schema is provided.
        let finalSystem = systemInstruction || "";
        if (responseSchema) {
            finalSystem += `\n\nYou MUST return your response as valid JSON matching this schema: ${JSON.stringify(responseSchema)}`;
        }

        const response = await client.messages.create({
            model: modelId,
            max_tokens: 8192,
            system: finalSystem,
            messages: [{ role: 'user', content: prompt }]
        });

        return { text: response.content[0].text, usage: response.usage };
    }

    throw new Error(`Unsupported AI Provider: ${provider}`);
};

// ============================================================================
// 2. DYNAMIC YOUTUBE SEARCHER (No hardcoded models)
// ============================================================================
const findSupplementaryVideo = async (searchQuery, searcherConfig) => {
    // Only Gemini supports the native Google Search tool currently
    const ai = new GoogleGenAI({ vertexai: true, project: process.env.GOOGLE_CLOUD_PROJECT, location: process.env.GOOGLE_CLOUD_LOCATION });

    const response = await ai.models.generateContent({
        model: searcherConfig.model || 'gemini-3.1-pro-preview',
        contents: `Find the best YouTube tutorial for: "${searchQuery}". Return ONLY the raw YouTube URL.`,
        config: { tools: [{ googleSearch: {} }], temperature: 0.1 }
    });
    return response.text.trim();
};

// ============================================================================
// 3. THE ARCHITECT (Dynamic Provider Injection)
// ============================================================================
export const generateCourseBlueprint = async (topic, audience, routingConfig, youtubeUrl, fileUploads) => {
    const architectConfig = routingConfig.architect;
    const searcherConfig = routingConfig.searcher; // New explicit searcher role

    const files =[];
    if (youtubeUrl) files.push({ fileData: { fileUri: youtubeUrl, mimeType: "video/mp4" } });
    for (const file of fileUploads) {
        files.push({ inlineData: { data: file.buffer.toString("base64"), mimeType: file.mimetype } });
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

    const systemInstruction = "You are a Senior Curriculum Architect. You must output perfectly valid JSON.";

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            modules: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        start_time: { type: Type.STRING }, end_time: { type: Type.STRING },
                        title: { type: Type.STRING }, objective: { type: Type.STRING },
                        needs_search: { type: Type.BOOLEAN }, search_query: { type: Type.STRING }
                    },
                    required: ["title", "objective", "needs_search"]
                }
            }
        },
        required: ["title", "modules"]
    };

    // CALL THE DYNAMIC ROUTER
    const result = await callAI(architectConfig, prompt, systemInstruction, responseSchema, files);
    let blueprint = JSON.parse(result.text);

    // Dynamic Search Loop
    for (let i = 0; i < blueprint.modules.length; i++) {
        if (blueprint.modules[i].needs_search && blueprint.modules[i].search_query) {
            try {
                const foundUrl = await pRetry(() => findSupplementaryVideo(blueprint.modules[i].search_query, searcherConfig), { retries: 2 });
                blueprint.modules[i].supplementary_url = foundUrl;
                blueprint.modules[i].start_time = "00:00"; blueprint.modules[i].end_time = "10:00"; blueprint.modules[i].is_supplementary = true;
            } catch (err) { console.error("Search failed."); }
        }
    }

    // Append Career Launchpad
    blueprint.modules.push(
        { title: "Career: Tech Resume Building", objective: "Tailor a resume.", is_static: true },
        { title: "Career: Interview Prep", objective: "Common questions.", is_static: true }
    );

    return { blueprint, usage: result.usage };
};

// ============================================================================
// 4. THE EXTRACTOR (Dynamic Provider Injection)
// ============================================================================
export const extractStepsForModule = async (moduleTitle, blueprint, routingConfig, courseId, command) => {
    const extractorConfig = routingConfig.lesson; // Lesson extractor engine

    const prompt = `Module: "${moduleTitle}". Course Context: ${JSON.stringify(blueprint)}. Refinement: ${command || "Focus on practical UI actions."}`;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                step_type: { type: Type.STRING }, instruction_text: { type: Type.STRING },
                required_action: { type: Type.STRING }, success_state: { type: Type.STRING },
                ui_target: { type: Type.OBJECT, properties: { description: { type: Type.STRING } } }
            },
            required: ["step_type", "instruction_text"]
        }
    };

    const result = await callAI(extractorConfig, prompt, "You are an AI UI Technical Writer.", responseSchema,[]);
    return { steps: JSON.parse(result.text), usage: result.usage };
};