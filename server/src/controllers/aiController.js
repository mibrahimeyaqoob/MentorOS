import * as aiService from '../services/aiService.js';
import { supabase } from '../config/db.js';

export const generateBlueprint = async (req, res, next) => {
    try {
        // Since we use FormData on the frontend now, data comes in req.body as strings
        const { topic, audience, engineConfig, youtubeUrl } = req.body;
        const parsedConfig = JSON.parse(engineConfig);
        const files = req.files ||[];

        const result = await aiService.generateCourseBlueprint(topic, audience, parsedConfig, youtubeUrl, files);
        res.json({ success: true, blueprint: result.blueprint, usage: result.usage });
    } catch (error) { next(error); }
};

export const refineBlueprint = async (req, res, next) => {
    try {
        const { currentBlueprint, prompt, engineConfig } = req.body;
        const result = await aiService.refineCourseBlueprint(currentBlueprint, prompt, engineConfig);
        res.json({ success: true, blueprint: result.blueprint });
    } catch (error) { next(error); }
}

export const extractSteps = async (req, res, next) => {
    try {
        const { moduleTitle, blueprint, engineConfig, courseId, command } = req.body;
        const result = await aiService.extractStepsForModule(moduleTitle, blueprint, engineConfig, courseId, command);
        res.json({ success: true, steps: result.steps, usage: result.usage });
    } catch (error) { next(error); }
};

export const refineSteps = async (req, res, next) => {
    try {
        const { currentSteps, prompt, engineConfig } = req.body;
        const result = await aiService.refineModuleSteps(currentSteps, prompt, engineConfig);
        res.json({ success: true, steps: result.steps });
    } catch (error) { next(error); }
}

export const getYoutubeMeta = async (req, res, next) => {
    try {
        const { url } = req.body;
        res.json({ success: true, metadata: { duration: 0, title: "Ready for Native Vertex Processing" } }); 
    } catch (error) { next(error); }
};

export const ingestKnowledge = async (req, res, next) => {
    try {
        // Simplified for now - will be expanded when we build Vector Brain fully
        res.json({ success: true, chunks: 0 });
    } catch (error) { next(error); }
};