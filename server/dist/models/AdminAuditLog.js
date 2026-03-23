import mongoose from 'mongoose';
const adminAuditLogSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, required: true, trim: true },
    summary: { type: String, default: '', trim: true },
}, { timestamps: true });
export const AdminAuditLogModel = mongoose.models.AdminAuditLog ||
    mongoose.model('AdminAuditLog', adminAuditLogSchema);
