import express from 'express';
import { ActivityModel } from '../models/Activity.js';
export const activityRoutes = express.Router();
activityRoutes.get('/', async (_req, res) => {
    const activities = await ActivityModel.find({ status: 'Published' })
        .sort({ eventDate: 1, createdAt: -1 })
        .lean();
    return res.json({
        activities: activities.map((item) => ({
            ...item,
            id: item._id.toString(),
            createdBy: item.createdBy.toString(),
        })),
    });
});
