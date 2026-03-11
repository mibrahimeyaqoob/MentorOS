import { GoogleGenAI, Type } from '@google/genai';
import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import pRetry from 'p-retry';

// ============================================================================
// CUSTOM ERROR CLASSES FOR ENTERPRISE TRACEABILITY
// ============================================================================
class ConfigurationError extends Error {
    constructor(message) { super(message); this.name = "ConfigurationError"; this.status = 400; }
}
class RateLimitError extends Error {
    constructor(model) { super(`Rate Limit Exceeded (429) for ${model}. The system attempted to auto-retry but the GCP quota is fully exhausted. Please wait 1 minute.`); this.name = "RateLimitError"; this.status = 429; }
}
class ProviderOutageError extends Error {
    constructor(model) { super(`AI Provider Outage (503/500) for ${model}. Google/Anthropic servers are currently down.`); this.name = "ProviderOutageError"; this.status = 503; }
}

// ============================================================================
// 1. THE MULTI-PROVIDER AI ROUTER & ERROR HANDLER (NO HARDCODING)
// ============================================================================
const callAI = async (engineConfig, prompt, systemInstruction = null, responseSchema = null, files =[]) => {

    // 🚨 ZERO HARDCODING: Must fail if config is missing
    if (!engineConfig || !engineConfig.model || !engineConfig.provider) {
        throw new ConfigurationError("Missing AI Configuration. Please assign a model to this task in the AI Command Center.");
    }

    const { provider, model: modelId } = engineConfig;
    console.log(`[AI Router] Routing task to ${provider.toUpperCase()} model: ${modelId}`);

    try {
        const response = await pRetry(async () => {
            try {
                if (provider === 'google') {
                    const ai = new GoogleGenAI({ 
                        vertexai: true, 
                        project: process.env.GOOGLE_CLOUD_PROJECT, 
                        location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
                    });

                    const parts = [{ text: prompt }];
                    if (files.length > 0) parts.unshift(...files);

                    const config = { thinkingConfig: { thinkingLevel: 'HIGH' } }; 
                    if (systemInstruction) config.systemInstruction = systemInstruction;
                    if (responseSchema) {
                        config.responseMimeType = "application/json";
                        config.responseSchema = responseSchema;
                    }

                    const res = await ai.models.generateContent({
                        model: modelId,
                        contents:[{ role: 'user', parts }],
                        config
                    });
                    return { text: res.text, usage: res.usageMetadata };
                } 
                else if (provider === 'anthropic') {
                    const client = new AnthropicVertex({ 
                        projectId: process.env.GOOGLE_CLOUD_PROJECT, 
                        region: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
                    });

                    let finalSystem = systemInstruction || "You are a helpful AI assistant.";
                    if (responseSchema) {
                        finalSystem += `\n\nCRITICAL: You MUST return your response as valid JSON matching this schema: ${JSON.stringify(responseSchema)}`;
                    }

                    const res = await client.messages.create({
                        model: modelId,
                        max_tokens: 8192,
                        system: finalSystem,
                        messages: [{ role: 'user', content: prompt }]
                    });
                    return { text: res.content[0].text, usage: res.usage };
                }

                // If provider is something else (which shouldn't happen based on config check)
                throw new ConfigurationError(`Unsupported AI Provider: ${provider}`);

            } catch (err) {
                // Determine if we should abort retries
                if (err.status === 400 || err.status === 403) {
                    console.error(`[AI Router] Fatal Request Error (${err.status}): Malformed request or Auth failure.`);
                    throw new pRetry.AbortError(err);
                }
                throw err;
            }
        }, {
            retries: 3, 
            factor: 2.5,
            minTimeout: 2000,
            onFailedAttempt: error => {
                console.warn(`[AI Router] ⚠️ Model ${modelId} failed (Attempt ${error.attemptNumber}/4). Reason: ${error.message}`);
            }
        });

        return response;

    } catch (finalError) {
        if (finalError.status === 429) throw new RateLimitError(modelId);
        if (finalError.status >= 500) throw new ProviderOutageError(modelId);
        throw new Error(`AI Task Failed: ${finalError.message}`);
    }
};

// ============================================================================
// 2. DYNAMIC YOUTUBE SEARCHER
// ============================================================================
const findSupplementaryVideo = async (searchQuery, searcherConfig) => {
    if (!searcherConfig || !searcherConfig.model) {
        throw new ConfigurationError("Missing Searcher Model Configuration. Assign a model in the Command Center.");
    }

    // We enforce Google provider here because only Gemini supports googleSearch tool natively right now
    if (searcherConfig.provider !== 'google') {
       console.warn("[Search Engine] Warning: Searcher requires a Google model for native grounding. Attempting to proceed, but it may fail.");
    }

    console.log(`[Search Engine] Sourcing tutorial for: "${searchQuery}" using ${searcherConfig.model}...`);

    try {
        const ai = new GoogleGenAI({ vertexai: true, project: process.env.GOOGLE_CLOUD_PROJECT, location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1' });
        const response = await ai.models.generateContent({
            model: searcherConfig.model,
            contents: `Find the absolute best, most modern YouTube tutorial video for the specific topic: "${searchQuery}". Return ONLY the raw YouTube URL (https://www.youtube.com/watch?v=...). Do not include quotes, markdown, or explanation.`,
            config: { tools: [{ googleSearch: {} }], temperature: 0.0 }
        });
        return response.text.trim();
    } catch (e) {
        console.warn(`[Search Engine] Search failed for ${searchQuery}: ${e.message}`);
        throw e;
    }
};

// ============================================================================
// 3. GENERATE BLUEPRINT (THE ARCHITECT)
// ============================================================================
export const generateCourseBlueprint = async (topic, audience, routingConfig, youtubeUrl, fileUploads) => {
    const architectConfig = routingConfig.architect;
    const searcherConfig = routingConfig.searcher; 

    // NO DEFAULTS.
    if (!architectConfig || !architectConfig.model) {
         throw new ConfigurationError("Course Architect model is not configured in the AI Command Center.");
    }

    const files =[];
    if (youtubeUrl) files.push({ fileData: { fileUri: youtubeUrl, mimeType: "video/mp4" } });
    for (const file of fileUploads) {
        files.push({ inlineData: { data: file.buffer.toString("base64"), mimeType: file.mimetype } });
    }

    const systemInstruction = `
    ROLE: You are an Elite Enterprise Curriculum Architect.
    TASK: Synthesize the provided multi-modal data (video, PDFs, Code) into a master course blueprint.

    STRICT CONSTRAINTS:
    1. GRANULARITY: Core instructional modules MUST be exactly 1-minute blocks (e.g., 00:00-01:00, 01:00-02:00).
    2. MANDATORY INTRO: Module 1 is always 'Introduction & Overview'.
    3. MANDATORY SETUP: Module 2 is always 'Environment Setup'. If the source data lacks this, set "needs_search" to true and write a precise "search_query".
    4. MANDATORY CAPSTONE: The final core module is a 'Real-World Project'. If missing, set "needs_search" to true.

    OUTPUT: You must return perfectly formatted JSON adhering strictly to the provided schema. No preamble.
    `;

    const prompt = `<context>\nTopic: ${topic}\nTarget Audience: ${audience}\n</context>\n\nGenerate the JSON blueprint now.`;

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

    const result = await callAI(architectConfig, prompt, systemInstruction, responseSchema, files);
    let blueprint = JSON.parse(result.text);

    // Auto-Healing / Web Searching Loop
    for (let i = 0; i < blueprint.modules.length; i++) {
        if (blueprint.modules[i].needs_search && blueprint.modules[i].search_query) {
            try {
                // If searcher isn't configured, skip the search gracefully instead of crashing
                if(searcherConfig && searcherConfig.model) {
                     const foundUrl = await pRetry(() => findSupplementaryVideo(blueprint.modules[i].search_query, searcherConfig), { retries: 2 });
                     blueprint.modules[i].supplementary_url = foundUrl;
                     blueprint.modules[i].start_time = "00:00"; 
                     blueprint.modules[i].end_time = "10:00"; 
                     blueprint.modules[i].is_supplementary = true;
                } else {
                     console.warn("[Auto-Heal] Search skipped because Searcher model is not configured.");
                }
            } catch (err) { console.error(`[Auto-Heal] Failed to source video for: ${blueprint.modules[i].search_query}`); }
        }
    }

    blueprint.modules.push(
        { title: "Career: Tech Resume Building", objective: "Tailor a resume to bypass ATS systems.", is_static: true },
        { title: "Career: LinkedIn Optimization", objective: "Optimize profiles for recruiter discovery.", is_static: true }
    );

    return { blueprint, usage: result.usage };
};

// ============================================================================
// 4. REFINE BLUEPRINT (AI ASSISTED EDITING)
// ============================================================================
export const refineCourseBlueprint = async (currentBlueprint, prompt, routingConfig) => {
    const architectConfig = routingConfig.architect;
    if (!architectConfig || !architectConfig.model) throw new ConfigurationError("Course Architect model is not configured.");

    const systemInstruction = "ROLE: Senior Curriculum Architect. TASK: Apply the user's requested revisions to the provided JSON Blueprint. OUTPUT: Return the full, updated JSON array.";
    const aiPrompt = `<current_blueprint>\n${JSON.stringify(currentBlueprint)}\n</current_blueprint>\n\n<revision_request>\n${prompt}\n</revision_request>`;

    const result = await callAI(architectConfig, aiPrompt, systemInstruction, null,[]);
    return { blueprint: JSON.parse(result.text) };
};

// ============================================================================
// 5. EXTRACT MODULE STEPS (THE ACTION MAPPER)
// ============================================================================
export const extractStepsForModule = async (moduleTitle, blueprint, routingConfig, courseId, command) => {
    const lessonConfig = routingConfig.lesson; 
    if (!lessonConfig || !lessonConfig.model) throw new ConfigurationError("Action Map Extractor model is not configured.");

    const systemInstruction = `
    ROLE: You are an AI UI Data Extractor and Technical Writer.
    TASK: Convert high-level course objectives into microscopic, step-by-step UI interactions that a Computer Vision model can follow.

    RULES:
    - Break complex tasks into atomic clicks (e.g., instead of "Login", write Step 1: "Click Email", Step 2: "Type email", Step 3: "Click Submit").
    - If the user performs an action on screen, use 'action_trigger'. 
    - The 'ui_target.description' MUST visually describe the button.
    - If the instructor is just explaining theory, use 'dialogue'.
    `;

    const prompt = `
    <module_target>"${moduleTitle}"</module_target>
    <course_context>${JSON.stringify(blueprint)}</course_context>
    <admin_directives>${command || "Focus exclusively on practical UI actions and exact visual locations."}</admin_directives>

    Generate the JSON Action Map array.
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                step_type: { type: Type.STRING, enum:["action_trigger", "dialogue"] }, 
                instruction_text: { type: Type.STRING, description: "What the AI Tutor will say out loud" },
                required_action: { type: Type.STRING, enum:["left_click", "double_click", "type_text", "drag_and_drop", "none"] }, 
                success_state: { type: Type.STRING },
                ui_target: { 
                    type: Type.OBJECT, 
                    properties: { 
                        description: { type: Type.STRING, description: "Highly visual description of the target element." },
                        label: { type: Type.STRING }
                    } 
                }
            },
            required:["step_type", "instruction_text"]
        }
    };

    const result = await callAI(lessonConfig, prompt, systemInstruction, responseSchema,[]);
    return { steps: JSON.parse(result.text), usage: result.usage };
};

// ============================================================================
// 6. REFINE MODULE STEPS (AI ASSISTED EDITING)
// ============================================================================
export const refineModuleSteps = async (currentSteps, prompt, routingConfig) => {
    const lessonConfig = routingConfig.lesson;
    if (!lessonConfig || !lessonConfig.model) throw new ConfigurationError("Action Map Extractor model is not configured.");

    const systemInstruction = "ROLE: Technical Writer. TASK: Modify the JSON Action Map based on the user's request. Preserve schema.";
    const aiPrompt = `<current_steps>\n${JSON.stringify(currentSteps)}\n</current_steps>\n\n<revision_request>\n${prompt}\n</revision_request>`;

    const result = await callAI(lessonConfig, aiPrompt, systemInstruction, null,[]);
    return { steps: JSON.parse(result.text) };
};

// ============================================================================
// 7. GENERATE VECTOR EMBEDDINGS
// ============================================================================
export const generateEmbeddings = async (text, routingConfig) => {
    const embedderConfig = routingConfig.embedder;
    if (!embedderConfig || !embedderConfig.model) throw new ConfigurationError("Vector Embedder model is not configured.");

    if (embedderConfig.provider === 'google') {
        const ai = new GoogleGenAI({ vertexai: true, project: process.env.GOOGLE_CLOUD_PROJECT, location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1' });
        const response = await ai.models.embedContent({
            model: embedderConfig.model,
            contents: text
        });
        return response.embeddings[0].values;
    }
    throw new ConfigurationError("Currently, only Google models are supported for embeddings.");
};