import mongoose, { InferSchemaType, Model } from 'mongoose'

const activitySchema = new mongoose.Schema(
  {
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
  },
  { timestamps: true },
)

export type ActivityDoc = InferSchemaType<typeof activitySchema> & {
  _id: mongoose.Types.ObjectId
}

export const ActivityModel: Model<ActivityDoc> =
  (mongoose.models.Activity as Model<ActivityDoc>) ||
  mongoose.model<ActivityDoc>('Activity', activitySchema)
