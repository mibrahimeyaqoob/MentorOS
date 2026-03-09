import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import systemRoutes from './routes/systemRoutes.js'; // New
import courseRoutes from './routes/courseRoutes.js'; // New
import aiRoutes from './routes/aiRoutes.js';         // New
import testRoutes from './routes/testRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/', (req, res) => {
    res.json({ message: "MentorOS API is online.", version: "2.0" });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/test', testRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🚀 System Online: MentorOS Watchtower active on port ${PORT}`);
});