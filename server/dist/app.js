import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { authRoutes } from './routes/authRoutes.js';
import { submissionRoutes } from './routes/submissionRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { activityRoutes } from './routes/activityRoutes.js';
export const app = express();
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }
        if (origin === env.clientOrigin || /^http:\/\/localhost:\d+$/.test(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('Origin not allowed by CORS'));
    },
}));
app.use(express.json({ limit: '8mb' }));
app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/activities', activityRoutes);
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
});
