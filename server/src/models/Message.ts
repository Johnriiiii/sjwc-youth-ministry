import mongoose, { InferSchemaType, Model } from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
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
  },
  { timestamps: true },
)

export type MessageDoc = InferSchemaType<typeof messageSchema> & {
  _id: mongoose.Types.ObjectId
}

export const MessageModel: Model<MessageDoc> =
  (mongoose.models.Message as Model<MessageDoc>) ||
  mongoose.model<MessageDoc>('Message', messageSchema)
