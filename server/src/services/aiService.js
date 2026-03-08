import { VertexAI } from '@google-cloud/vertexai';
import { supabase } from '../config/db.js';
import { decrypt } from '../utils/crypto.js';

// --- 1. Initialize Vertex AI ---
const getVertexAIClient = async (keyId) => {
    const { data } = await supabase.from('api_keys').select('encrypted_key').eq('id', keyId).single();
    if (!data) throw new Error("Google Cloud credentials not found.");

    const credentialsJson = JSON.parse(decrypt(data.encrypted_key));

    return new VertexAI({
        project: credentialsJson.project_id,
        location: 'global',
        googleAuthOptions: {
            credentials: {
                client_email: credentialsJson.client_email,
                private_key: credentialsJson.private_key
            }
        }
    });
};

// --- 2. GENERATE BLUEPRINT (Gemini 3.1 Pro) ---
// The AI searches the URL and defines the 2-minute chunks itself!
export const generateCourseBlueprint = async (topic, audience, engineConfig, sources) => {
    const vertexAI = await getVertexAIClient(engineConfig.keyId);
    const generativeModel = vertexAI.getGenerativeModel({ 
        model: engineConfig.model,
        generationConfig: { responseMimeType: "application/json" },
        // Enable Google Search to allow it to read the YouTube link context
        tools:[{ googleSearchRetrieval: {} }]
    });

    const youtubeUrl = sources.find(s => s.type === 'youtube')?.url || "No URL provided";

    const prompt = `
    Role: Senior Curriculum Architect.
    Task: Create a structured course blueprint from this YouTube video.
    Video URL: ${youtubeUrl}
    Topic: ${topic}
    Audience: ${audience}

    Instructions:
    1. Analyze the video content.
    2. Break the video down into chronological modules.
    3. Each module should cover approximately 2 minutes of the video.
    4. Provide the exact start_time and end_time for each module.

    Return STRICT JSON format:
    {
        "title": "Course Title based on video",
        "modules":[
            { 
                "title": "Module 1 Name", 
                "objective": "What they learn",
                "start_time": "00:00",
                "end_time": "02:00"
            },
            { 
                "title": "Module 2 Name", 
                "objective": "What they learn",
                "start_time": "02:00",
                "end_time": "04:00"
            }
        ]
    }`;

    const request = { contents: [{ role: 'user', parts:[{ text: prompt }] }] };
    const result = await generativeModel.generateContent(request);

    let textResult = result.response.candidates[0].content.parts[0].text;
    if (textResult.startsWith('```json')) textResult = textResult.replace(/```json|```/g, '');

    return { 
        blueprint: JSON.parse(textResult), 
        usage: result.response.usageMetadata 
    };
};

// --- 3. BATCH EXTRACTOR (Gemini 3 Flash) ---
// Takes the Blueprint modules and processes them in parallel!
export const batchExtractUIActions = async (youtubeUrl, blueprint, engineConfig) => {
    const vertexAI = await getVertexAIClient(engineConfig.keyId);
    const model = vertexAI.getGenerativeModel({ 
        model: engineConfig.model, 
        generationConfig: { responseMimeType: "application/json" },
        tools:[{ googleSearchRetrieval: {} }]
    });

    const modules = blueprint.modules ||[];
    console.log(`⚡ Starting Parallel Extraction for ${modules.length} modules...`);

    // Worker function for a single module
    const processModule = async (module, index) => {
        const prompt = `
        Role: AI Technical Writer & UI Analyzer.
        Task: Extract physical UI actions (clicks, types, drags) from the provided YouTube video.
        Video URL: ${youtubeUrl}

        CRITICAL: ONLY analyze the video between ${module.start_time} and ${module.end_time}.
        Module Topic: ${module.title}

        Return JSON Array (Strict):[
            {
                "step_type": "action_trigger",
                "instruction_text": "Spoken instruction to the user",
                "required_action": "left_click",
                "ui_target": { "label": "Button/Element Name", "description": "Visual location on screen" },
                "success_state": "What happens next"
            }
        ]
        If it's just theory with no UI actions, return a "dialogue" step. If nothing happens, return[].
        `;

        try {
            const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
            let text = result.response.candidates[0].content.parts[0].text;
            if (text.startsWith('```json')) text = text.replace(/```json|```/g, '');
            return JSON.parse(text);
        } catch (err) {
            console.error(`Module ${index + 1} extraction failed:`, err.message);
            return[]; // Return empty so we don't break the whole batch
        }
    };

    // Execute all module extractions in parallel
    const results = await Promise.all(modules.map((mod, i) => processModule(mod, i)));

    // Results is an array of arrays (each module's steps). 
    // We return it exactly like this so the frontend can map it directly to the modules.
    const stepsByModule = {};
    let totalActions = 0;

    results.forEach((moduleSteps, idx) => {
        stepsByModule[idx] = moduleSteps;
        totalActions += moduleSteps.length;
    });

    return { 
        stepsByModule, 
        totalChunks: modules.length, 
        processedCount: totalActions 
    };
};

// --- 4. Embeddings ---
export const generateEmbeddings = async (text, engineConfig) => {
    const vertexAI = await getVertexAIClient(engineConfig.keyId);
    const model = engineConfig.model || 'text-embedding-005';

    const embeddingModel = vertexAI.getGenerativeModel({ model: model });
    const result = await embeddingModel.embedContent({ content: { parts: [{ text }] } });

    return result.embedding.values;
};