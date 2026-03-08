import * as aiService from '../services/aiService.js';
import { supabase } from '../config/db.js';

export const generateBlueprint = async (req, res, next) => {
    try {
        const { topic, audience, engineConfig, knowledgeSources } = req.body;
        const result = await aiService.generateCourseBlueprint(topic, audience, engineConfig, knowledgeSources);
        res.json({ success: true, blueprint: result.blueprint, usage: result.usage });
    } catch (error) { next(error); }
};

export const batchExtract = async (req, res, next) => {
    try {
        const { youtubeUrl, blueprint, engineConfig } = req.body;

        const result = await aiService.batchExtractUIActions(youtubeUrl, blueprint, engineConfig);

        // Return the mapped steps directly
        res.json({ 
            success: true, 
            stepsByModule: result.stepsByModule, 
            metrics: { chunks: result.totalChunks, actionsFound: result.processedCount } 
        });
    } catch (error) { next(error); }
};

export const extractSteps = async (req, res, next) => {
    try {
        const { moduleTitle, blueprint, engineConfig, courseId, command } = req.body;
        const result = await aiService.extractStepsForModule(moduleTitle, blueprint, engineConfig, courseId, command);
        res.json({ success: true, steps: result.steps, usage: result.usage });
    } catch (error) { next(error); }
};

export const getYoutubeMeta = async (req, res, next) => {
    try {
        const { url } = req.body;
        const data = await aiService.fetchYoutubeContext(url);
        res.json({ success: true, metadata: { duration: data.duration * 60, title: "Video Found" } }); // Simple mock title for now
    } catch (error) { next(error); }
};

export const ingestKnowledge = async (req, res, next) => {
    try {
        const { courseId, engineConfig, sources, embedderConfig } = req.body;

        let chunksProcessed = 0;

        for (const source of sources) {
            let contentToEmbed = "";
            if (source.type === 'youtube') {
                const yt = await aiService.fetchYoutubeContext(source.url);
                contentToEmbed = yt.text;
            }

            // Chunking logic (simplified for now: 1000 chars)
            const chunks = contentToEmbed.match(/.{1,1000}/g) || [];

            for (const chunk of chunks) {
                const embedding = await aiService.generateEmbeddings(chunk, embedderConfig);

                await supabase.from('knowledge_chunks').insert({
                    course_id: courseId,
                    source_name: source.name,
                    source_type: source.type,
                    content: chunk,
                    embedding: embedding
                });
                chunksProcessed++;
            }
        }

        res.json({ success: true, chunks: chunksProcessed });
    } catch (error) { next(error); }
};