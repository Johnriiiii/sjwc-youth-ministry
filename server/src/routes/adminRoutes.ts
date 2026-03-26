import express from 'express'
import bcrypt from 'bcryptjs'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { SubmissionModel } from '../models/Submission.js'
import { ActivityModel } from '../models/Activity.js'
import { AdminAuditLogModel } from '../models/AdminAuditLog.js'
import { UserModel } from '../models/User.js'
import { env } from '../config/env.js'
import { generateActivationToken } from '../utils/activation.js'
import { sendActivationEmail } from '../utils/email.js'

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

adminRoutes.get('/users', async (_req, res) => {
  const users = await UserModel.find().sort({ createdAt: -1 }).lean()
  return res.json({
    users: users.map((item) => ({
      id: item._id.toString(),
      fullName: item.fullName,
      email: item.email,
      role: item.role === 1 ? 1 : 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  })
})

adminRoutes.post('/users', async (req, res) => {
  const { fullName, email, password, role } = req.body as {
    fullName?: string
    email?: string
    password?: string
    role?: 0 | 1
  }

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'fullName, email and password are required' })
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' })
  }

  const userRole = role === 1 ? 1 : 0
  const passwordHash = await bcrypt.hash(password, 10)
  const { plainToken, tokenHash } = generateActivationToken()
  const activationUrl = `${env.appBaseUrl}/api/auth/activate?token=${plainToken}`

  let created
  try {
    created = await UserModel.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: userRole,
      isEmailVerified: false,
      activationTokenHash: tokenHash,
      activationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
  } catch (error) {
    const code = (error as { code?: number }).code
    if (code === 11000) {
      return res.status(409).json({ message: 'Email is already registered' })
    }
    throw error
  }

  try {
    await sendActivationEmail({
      to: created.email,
      fullName: created.fullName,
      activationUrl,
    })
  } catch (error) {
    await UserModel.findByIdAndDelete(created._id)
    return res.status(500).json({
      message:
        error instanceof Error
          ? `User was not created because activation email failed: ${error.message}`
          : 'User was not created because activation email failed.',
    })
  }

  await writeAuditLog({
    adminId: req.auth?.sub,
    action: 'user.create',
    entityType: 'user',
    entityId: created._id.toString(),
    summary: `Created ${created.email} (${created.role === 1 ? 'Admin' : 'User'})`,
  })

  return res.status(201).json({
    user: {
      id: created._id.toString(),
      fullName: created.fullName,
      email: created.email,
      role: created.role === 1 ? 1 : 0,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    },
  })
})

adminRoutes.patch('/users/:id', async (req, res) => {
  const { id } = req.params
  const { fullName, email, password, role } = req.body as {
    fullName?: string
    email?: string
    password?: string
    role?: 0 | 1
  }

  const patch: {
    fullName?: string
    email?: string
    role?: 0 | 1
    passwordHash?: string
  } = {}

  if (typeof fullName === 'string') {
    patch.fullName = fullName.trim()
  }
  if (typeof email === 'string') {
    patch.email = email.trim().toLowerCase()
  }
  if (role === 0 || role === 1) {
    patch.role = role
  }
  if (typeof password === 'string') {
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }
    patch.passwordHash = await bcrypt.hash(password, 10)
  }

  if (!Object.keys(patch).length) {
    return res.status(400).json({ message: 'No editable fields provided' })
  }

  let updated
  try {
    updated = await UserModel.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    }).lean()
  } catch (error) {
    const code = (error as { code?: number }).code
    if (code === 11000) {
      return res.status(409).json({ message: 'Email is already registered' })
    }
    throw error
  }

  if (!updated) {
    return res.status(404).json({ message: 'User not found' })
  }

  await writeAuditLog({
    adminId: req.auth?.sub,
    action: 'user.edit',
    entityType: 'user',
    entityId: updated._id.toString(),
    summary: `Edited ${updated.email} (${updated.role === 1 ? 'Admin' : 'User'})`,
  })

  return res.json({
    user: {
      id: updated._id.toString(),
      fullName: updated.fullName,
      email: updated.email,
      role: updated.role === 1 ? 1 : 0,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  })
})

adminRoutes.delete('/users/:id', async (req, res) => {
  const { id } = req.params

  if (req.auth?.sub === id) {
    return res.status(400).json({ message: 'You cannot delete your own account' })
  }

  const deleted = await UserModel.findByIdAndDelete(id).lean()
  if (!deleted) {
    return res.status(404).json({ message: 'User not found' })
  }

  await writeAuditLog({
    adminId: req.auth?.sub,
    action: 'user.delete',
    entityType: 'user',
    entityId: deleted._id.toString(),
    summary: `Deleted ${deleted.email}`,
  })

  return res.json({ success: true })
})
