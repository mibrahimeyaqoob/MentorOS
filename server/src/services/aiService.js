// CHANGE THIS LINE (Line 1):
// FROM: import { GoogleGenerativeAI, SchemaType } from '@google/genai';
// TO:
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

import { supabase } from "../config/db.js";
import { decrypt } from "../utils/crypto.js";
import { YoutubeTranscript } from "youtube-transcript";

// Helper to initialize GenAI with a dynamic key
const getGenAIClient = async (keyId) => {
    const { data } = await supabase
        .from("api_keys")
        .select("encrypted_key")
        .eq("id", keyId)
        .single();
    if (!data) throw new Error("API Key not found or revoked.");

    const apiKey = decrypt(data.encrypted_key);
    return new GoogleGenerativeAI(apiKey);
};

// 1. YouTube Metadata & Transcript
export const fetchYoutubeContext = async (url) => {
    try {
        // Extract ID
        const videoId = url.split("v=")[1]?.split("&")[0];
        if (!videoId) return { text: "", duration: 0 };

        // Attempt Transcript Fetch
        const transcriptItems =
            await YoutubeTranscript.fetchTranscript(videoId);
        const fullText = transcriptItems.map((item) => item.text).join(" ");

        // Rough duration calc
        const lastItem = transcriptItems[transcriptItems.length - 1];
        const duration = (lastItem.offset + lastItem.duration) / 60; // in minutes

        return { text: fullText, duration };
    } catch (e) {
        console.warn(
            "Transcript fetch failed, falling back to URL only:",
            e.message,
        );
        return { text: "", duration: 0 };
    }
};

// 2. Blueprint Generation
export const generateCourseBlueprint = async (
    topic,
    audience,
    engineConfig,
    sources,
) => {
    const genAI = await getGenAIClient(engineConfig.keyId);

    // Updated Model instantiation
    const model = genAI.getGenerativeModel({
        model: engineConfig.model,
        generationConfig: { responseMimeType: "application/json" },
    });

    let contextData = "";
    // Process sources (simple text concatenation for now)
    for (const source of sources) {
        if (source.type === "youtube") {
            const ytData = await fetchYoutubeContext(source.url);
            contextData += `\n[Source: YouTube Video ${source.url}]\nTranscript: ${ytData.text.substring(0, 30000)}... (truncated)\n`;
        }
    }

    const prompt = `
    Role: Senior Curriculum Architect.
    Task: Create a structured course blueprint.
    Topic: ${topic}
    Audience: ${audience}

    Context Data:
    ${contextData}

    Return JSON format:
    {
        "title": "Course Title",
        "modules": [
            { "title": "Module 1 Name", "objective": "What they learn" },
            { "title": "Module 2 Name", "objective": "What they learn" }
        ]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = JSON.parse(result.response.text());

    return { blueprint: response, usage: result.response.usageMetadata };
};

// 3. Step Extraction (The Batch Processor)
export const extractStepsForModule = async (
    moduleTitle,
    blueprint,
    engineConfig,
    courseId,
    command,
) => {
    const genAI = await getGenAIClient(engineConfig.keyId);
    const model = genAI.getGenerativeModel({
        model: engineConfig.model,
        generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `
    Role: AI Tutor & Technical Writer.
    Task: Generate a step-by-step interactive lesson for the module: "${moduleTitle}".
    Course Context: ${JSON.stringify(blueprint)}

    Specific Command/Refinement: ${command || "Focus on practical UI actions."}

    Required JSON Output Format (Array of Objects):
    [
        {
            "step_type": "action_trigger", // or "dialogue"
            "instruction_text": "Spoken instruction by AI",
            "required_action": "left_click", // double_click, type_text, drag_and_drop
            "ui_target": {
                "description": "Visual description of the button/field to click",
                "label": "Text on the element"
            },
            "success_state": "What happens after action"
        }
    ]

    If it's purely theoretical, use "step_type": "dialogue" and omit ui_target.
    `;

    const result = await model.generateContent(prompt);
    const steps = JSON.parse(result.response.text());

    return { steps, usage: result.response.usageMetadata };
};

// 4. Vector Ingestion (Embedding)
export const generateEmbeddings = async (text, engineConfig) => {
    const genAI = await getGenAIClient(engineConfig.keyId);
    const model = genAI.getGenerativeModel({ model: "embedding-001" });

    const result = await model.embedContent(text);
    return result.embedding.values;
};
