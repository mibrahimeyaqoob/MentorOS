import express from 'express';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

router.get('/auth-test', async (req, res) => {
    try {
        const ai = new GoogleGenAI({ vertexai: true });
        const model = ai.models.get({ model: 'gemini-3.1-pro-preview' });
        res.json({ success: true, message: "GCP Auth Working!", model: model.name });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;