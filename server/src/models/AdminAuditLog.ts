import mongoose, { InferSchemaType, Model } from 'mongoose'

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, required: true, trim: true },
    summary: { type: String, default: '', trim: true },
  },
  { timestamps: true },
)

export type AdminAuditLogDoc = InferSchemaType<typeof adminAuditLogSchema> & {
  _id: mongoose.Types.ObjectId
}

export const AdminAuditLogModel: Model<AdminAuditLogDoc> =
  (mongoose.models.AdminAuditLog as Model<AdminAuditLogDoc>) ||
  mongoose.model<AdminAuditLogDoc>('AdminAuditLog', adminAuditLogSchema)
