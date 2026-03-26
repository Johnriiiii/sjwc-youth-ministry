import mongoose from 'mongoose';
const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    messageType: {
        type: String,
        enum: ['Announcement', 'Event Reminder', 'Personal', 'Emergency'],
        default: 'Announcement',
        required: true,
    },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isPinned: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['Draft', 'Sent', 'Archived'],
        default: 'Sent',
        required: true,
    },
}, { timestamps: true });
export const MessageModel = mongoose.models.Message ||
    mongoose.model('Message', messageSchema);
