import mongoose, { InferSchemaType, Model } from 'mongoose'

const submissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true, trim: true },
    middleName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    age: { type: Number, required: true },
    birthdate: { type: String, required: true },
    registrationDate: { type: String, required: true },
    contactNumber: { type: String, required: true },
    address: { type: String, required: true },
    guardianContact: { type: String, required: true },
    emergencyContactPerson: { type: String, required: true },
    emergencyContactNumber: { type: String, required: true },
    photoData: { type: String, required: true },
    photoName: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'Approved'], default: 'Pending' },
  },
  { timestamps: true },
)

export type SubmissionDoc = InferSchemaType<typeof submissionSchema> & {
  _id: mongoose.Types.ObjectId
}

export const SubmissionModel: Model<SubmissionDoc> =
  (mongoose.models.Submission as Model<SubmissionDoc>) ||
  mongoose.model<SubmissionDoc>('Submission', submissionSchema)
