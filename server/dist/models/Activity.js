import mongoose from 'mongoose';
const activitySchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    details: { type: String, required: true, trim: true },
    eventDate: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['Draft', 'Published', 'Archived'],
        default: 'Published',
        required: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
export const ActivityModel = mongoose.models.Activity ||
    mongoose.model('Activity', activitySchema);
