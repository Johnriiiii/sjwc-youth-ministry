import express from 'express'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { SubmissionModel } from '../models/Submission.js'
import { ActivityModel } from '../models/Activity.js'
import { AdminAuditLogModel } from '../models/AdminAuditLog.js'

export const adminRoutes = express.Router()

adminRoutes.use(requireAuth, requireAdmin)

const toSafeStatus = (value: unknown) => (value === 'Approved' ? 'Approved' : 'Pending')

const mapSubmission = (item: {
  _id: { toString: () => string }
  userId: { toString: () => string }
  status?: unknown
  [key: string]: unknown
}) => ({
  ...item,
  id: item._id.toString(),
  userId: item.userId.toString(),
  status: toSafeStatus(item.status),
})

const writeAuditLog = async (input: {
  adminId?: string
  action: string
  entityType: string
  entityId: string
  summary: string
}) => {
  if (!input.adminId) return
  await AdminAuditLogModel.create({
    adminId: input.adminId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
  })
}

adminRoutes.get('/submissions', async (_req, res) => {
  const submissions = await SubmissionModel.find().sort({ createdAt: -1 }).lean()
  return res.json({
    submissions: submissions.map((item) => mapSubmission(item)),
  })
})

adminRoutes.patch('/submissions/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body as { status?: 'Pending' | 'Approved' }

  if (!status || !['Pending', 'Approved'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' })
  }

  const updated = await SubmissionModel.findByIdAndUpdate(
    id,
    { status },
    { new: true },
  ).lean()

  if (!updated) {
    return res.status(404).json({ message: 'Submission not found' })
  }

  await writeAuditLog({
    adminId: req.auth?.sub,
    action: 'submission.status.update',
    entityType: 'submission',
    entityId: updated._id.toString(),
    summary: `Set status to ${status} for ${updated.fullName}`,
  })

  return res.json({
    submission: mapSubmission(updated),
  })
})

adminRoutes.patch('/submissions/:id', async (req, res) => {
  const { id } = req.params
  const body = req.body as {
    fullName?: string
    middleName?: string
    gender?: 'Male' | 'Female' | 'Other'
    age?: number | string
    birthdate?: string
    registrationDate?: string
    contactNumber?: string
    address?: string
    guardianContact?: string
    emergencyContactPerson?: string
    emergencyContactNumber?: string
  }

  const patch: Record<string, string | number> = {}

  if (typeof body.fullName === 'string') patch.fullName = body.fullName.trim()
  if (typeof body.middleName === 'string') patch.middleName = body.middleName.trim()
  if (typeof body.gender === 'string' && ['Male', 'Female', 'Other'].includes(body.gender)) {
    patch.gender = body.gender
  }
  if (typeof body.birthdate === 'string') patch.birthdate = body.birthdate
  if (typeof body.registrationDate === 'string') patch.registrationDate = body.registrationDate
  if (typeof body.contactNumber === 'string') patch.contactNumber = body.contactNumber.trim()
  if (typeof body.address === 'string') patch.address = body.address.trim()
  if (typeof body.guardianContact === 'string') patch.guardianContact = body.guardianContact.trim()
  if (typeof body.emergencyContactPerson === 'string') {
    patch.emergencyContactPerson = body.emergencyContactPerson.trim()
  }
  if (typeof body.emergencyContactNumber === 'string') {
    patch.emergencyContactNumber = body.emergencyContactNumber.trim()
  }

  if (body.age !== undefined) {
    const ageNum = Number(body.age)
    if (!Number.isFinite(ageNum) || ageNum <= 0) {
      return res.status(400).json({ message: 'Invalid age value' })
    }
    patch.age = Math.floor(ageNum)
  }

  if (!Object.keys(patch).length) {
    return res.status(400).json({ message: 'No editable fields provided' })
  }

  const updated = await SubmissionModel.findByIdAndUpdate(id, patch, {
    new: true,
    runValidators: true,
  }).lean()

  if (!updated) {
    return res.status(404).json({ message: 'Submission not found' })
  }

  await writeAuditLog({
    adminId: req.auth?.sub,
    action: 'submission.edit',
    entityType: 'submission',
    entityId: updated._id.toString(),
    summary: `Edited profile details for ${updated.fullName}`,
  })

  return res.json({
    submission: mapSubmission(updated),
  })
})

adminRoutes.delete('/submissions/:id', async (req, res) => {
  const { id } = req.params

  const deleted = await SubmissionModel.findByIdAndDelete(id).lean()

  if (!deleted) {
    return res.status(404).json({ message: 'Submission not found' })
  }

  await writeAuditLog({
    adminId: req.auth?.sub,
    action: 'submission.delete',
    entityType: 'submission',
    entityId: deleted._id.toString(),
    summary: `Deleted submission of ${deleted.fullName}`,
  })

  return res.json({ success: true })
})

adminRoutes.get('/activities', async (_req, res) => {
  const activities = await ActivityModel.find().sort({ eventDate: 1, createdAt: -1 }).lean()
  return res.json({
    activities: activities.map((item) => ({
      ...item,
      id: item._id.toString(),
      createdBy: item.createdBy.toString(),
    })),
  })
})

adminRoutes.post('/activities', async (req, res) => {
  const { title, details, eventDate, location, status } = req.body as {
    title?: string
    details?: string
    eventDate?: string
    location?: string
    status?: 'Draft' | 'Published' | 'Archived'
  }

  if (!title || !details || !eventDate || !location) {
    return res.status(400).json({ message: 'Please complete all activity fields' })
  }

  const created = await ActivityModel.create({
    title: title.trim(),
    details: details.trim(),
    eventDate,
    location: location.trim(),
    status: status && ['Draft', 'Published', 'Archived'].includes(status) ? status : 'Published',
    createdBy: req.auth?.sub,
  })

  await writeAuditLog({
    adminId: req.auth?.sub,
    action: 'activity.create',
    entityType: 'activity',
    entityId: created._id.toString(),
    summary: `Created activity ${created.title}`,
  })

  return res.status(201).json({
    activity: {
      ...created.toObject(),
      id: created._id.toString(),
      createdBy: created.createdBy.toString(),
    },
  })
})

adminRoutes.patch('/activities/:id', async (req, res) => {
  const { id } = req.params
  const body = req.body as {
    title?: string
    details?: string
    eventDate?: string
    location?: string
    status?: 'Draft' | 'Published' | 'Archived'
  }

  const patch: Record<string, string> = {}
  if (typeof body.title === 'string') patch.title = body.title.trim()
  if (typeof body.details === 'string') patch.details = body.details.trim()
  if (typeof body.eventDate === 'string') patch.eventDate = body.eventDate
  if (typeof body.location === 'string') patch.location = body.location.trim()
  if (typeof body.status === 'string' && ['Draft', 'Published', 'Archived'].includes(body.status)) {
    patch.status = body.status
  }

  if (!Object.keys(patch).length) {
    return res.status(400).json({ message: 'No editable fields provided' })
  }

  const updated = await ActivityModel.findByIdAndUpdate(id, patch, {
    new: true,
    runValidators: true,
  }).lean()

  if (!updated) {
    return res.status(404).json({ message: 'Activity not found' })
  }

  await writeAuditLog({
    adminId: req.auth?.sub,
    action: 'activity.edit',
    entityType: 'activity',
    entityId: updated._id.toString(),
    summary: `Edited activity ${updated.title}`,
  })

  return res.json({
    activity: {
      ...updated,
      id: updated._id.toString(),
      createdBy: updated.createdBy.toString(),
    },
  })
})

adminRoutes.patch('/activities/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body as { status?: 'Draft' | 'Published' | 'Archived' }

  if (!status || !['Draft', 'Published', 'Archived'].includes(status)) {
    return res.status(400).json({ message: 'Invalid activity status value' })
  }

  const updated = await ActivityModel.findByIdAndUpdate(id, { status }, { new: true }).lean()

  if (!updated) {
    return res.status(404).json({ message: 'Activity not found' })
  }

  await writeAuditLog({
    adminId: req.auth?.sub,
    action: 'activity.status.update',
    entityType: 'activity',
    entityId: updated._id.toString(),
    summary: `Set activity ${updated.title} to ${status}`,
  })

  return res.json({
    activity: {
      ...updated,
      id: updated._id.toString(),
      createdBy: updated.createdBy.toString(),
    },
  })
})

adminRoutes.delete('/activities/:id', async (req, res) => {
  const { id } = req.params
  const deleted = await ActivityModel.findByIdAndDelete(id).lean()

  if (!deleted) {
    return res.status(404).json({ message: 'Activity not found' })
  }

  await writeAuditLog({
    adminId: req.auth?.sub,
    action: 'activity.delete',
    entityType: 'activity',
    entityId: deleted._id.toString(),
    summary: `Deleted activity ${deleted.title}`,
  })

  return res.json({ success: true })
})

adminRoutes.get('/audit-logs', async (_req, res) => {
  const logs = await AdminAuditLogModel.find().sort({ createdAt: -1 }).limit(100).lean()
  return res.json({
    logs: logs.map((item) => ({
      ...item,
      id: item._id.toString(),
      adminId: item.adminId.toString(),
    })),
  })
})
