import express from 'express'
import bcrypt from 'bcryptjs'
import { UserModel } from '../models/User.js'
import { signToken } from '../utils/token.js'
import { requireAuth } from '../middleware/auth.js'

export const authRoutes = express.Router()

authRoutes.post('/signup', async (req, res) => {
  const { fullName, email, password } = req.body as {
    fullName?: string
    email?: string
    password?: string
  }

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'fullName, email and password are required' })
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' })
  }

  const existing = await UserModel.findOne({ email: email.toLowerCase() })
  if (existing) {
    return res.status(409).json({ message: 'Email is already registered' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await UserModel.create({
    fullName,
    email: email.toLowerCase(),
    passwordHash,
    role: 0,
  })

  const token = signToken({
    sub: user._id.toString(),
    role: user.role === 1 ? 1 : 0,
    email: user.email,
  })
  return res.status(201).json({
    token,
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  })
})

authRoutes.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  const user = await UserModel.findOne({ email: email.toLowerCase() })
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ message: 'Invalid email or password' })
  }

  const token = signToken({
    sub: user._id.toString(),
    role: user.role === 1 ? 1 : 0,
    email: user.email,
  })

  return res.json({
    token,
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  })
})

authRoutes.get('/me', requireAuth, async (req, res) => {
  const id = req.auth?.sub
  if (!id) return res.status(401).json({ message: 'Unauthorized' })

  const user = await UserModel.findById(id).lean()
  if (!user) return res.status(404).json({ message: 'User not found' })

  return res.json({
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  })
})
