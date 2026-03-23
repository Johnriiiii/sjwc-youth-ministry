import mongoose, { InferSchemaType, Model } from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: Number, enum: [0, 1], default: 0 },
  },
  { timestamps: true },
)

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId }

export const UserModel: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>('User', userSchema)
