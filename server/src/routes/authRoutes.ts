import express from 'express'
import bcrypt from 'bcryptjs'
import { UserModel } from '../models/User.js'
import { signToken } from '../utils/token.js'
import { requireAuth } from '../middleware/auth.js'
import { env } from '../config/env.js'
import { generateActivationToken, hashActivationToken } from '../utils/activation.js'
import { sendActivationEmail } from '../utils/email.js'

export const authRoutes = express.Router()

const resolveBackendOrigin = (req: express.Request) => {
  const forwardedProto = req.header('x-forwarded-proto')?.split(',')[0]?.trim()
  const protocol = forwardedProto || req.protocol
  const host = req.get('host')

  return host ? `${protocol}://${host}` : env.appBaseUrl
}

const renderActivationPage = (input: {
  title: string
  message: string
  ctaLabel: string
  ctaHref: string
  tone: 'success' | 'error'
}) => {
  const isSuccess = input.tone === 'success'
  const badgeText = isSuccess ? 'Account Ready' : 'Activation Needed'

  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${input.title}</title>
      <style>
        :root {
          --bg-1: #77cf1f;
          --bg-2: #2ead38;
          --card: rgba(244, 250, 238, 0.94);
          --text: #113a20;
          --muted: #487256;
          --accent: #f2df14;
          --accent-2: #8fd02f;
          --danger: #c03939;
          --success: #1f8a43;
        }

        * { box-sizing: border-box; }

        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          font-family: 'Segoe UI', Tahoma, sans-serif;
          background:
            radial-gradient(circle at 10% 10%, rgba(255, 255, 255, 0.14), transparent 45%),
            radial-gradient(circle at 90% 90%, rgba(245, 225, 24, 0.2), transparent 35%),
            linear-gradient(140deg, var(--bg-1), var(--bg-2));
          color: var(--text);
          padding: 20px;
        }

        .panel {
          width: min(560px, 100%);
          background: var(--card);
          border-radius: 24px;
          padding: 28px 24px;
          border: 1px solid rgba(255, 255, 255, 0.78);
          box-shadow: 0 24px 60px rgba(0, 70, 0, 0.24);
        }

        .badge {
          display: inline-block;
          margin-bottom: 14px;
          padding: 6px 11px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          background: ${isSuccess ? 'rgba(31, 138, 67, 0.14)' : 'rgba(192, 57, 57, 0.14)'};
          color: ${isSuccess ? 'var(--success)' : 'var(--danger)'};
        }

        h1 {
          margin: 0 0 10px;
          font-size: 30px;
          line-height: 1.15;
        }

        p {
          margin: 0;
          color: var(--muted);
          font-size: 16px;
        }

        .cta {
          margin-top: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          padding: 12px 18px;
          border-radius: 12px;
          font-weight: 700;
          color: #12401f;
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
          box-shadow: 0 8px 18px rgba(52, 139, 57, 0.28);
        }

        .note {
          margin-top: 12px;
          font-size: 13px;
          color: #5d8368;
        }
      </style>
    </head>
    <body>
      <main class="panel">
        <span class="badge">${badgeText}</span>
        <h1>${input.title}</h1>
        <p>${input.message}</p>
        <a class="cta" href="${input.ctaHref}">${input.ctaLabel}</a>
        <p class="note">If this page opened from an old email, request a new activation link from the login screen.</p>
      </main>
    </body>
  </html>
  `
}

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
  const { plainToken, tokenHash } = generateActivationToken()
  const activationUrl = `${resolveBackendOrigin(req)}/api/auth/activate?token=${plainToken}`

  const user = await UserModel.create({
    fullName,
    email: email.toLowerCase(),
    passwordHash,
    role: 0,
    isEmailVerified: false,
    activationTokenHash: tokenHash,
    activationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })

  try {
    await sendActivationEmail({
      to: user.email,
      fullName: user.fullName,
      activationUrl,
    })
  } catch (error) {
    await UserModel.findByIdAndDelete(user._id)
    return res.status(500).json({
      message:
        error instanceof Error
          ? `Account not created because activation email failed: ${error.message}`
          : 'Account not created because activation email failed.',
    })
  }

  return res.status(201).json({
    message: 'Account created. Please check your email for activation link before logging in.',
  })
})

authRoutes.post('/resend-activation', async (req, res) => {
  const { email } = req.body as { email?: string }

  if (!email) {
    return res.status(400).json({ message: 'Email is required' })
  }

  const user = await UserModel.findOne({ email: email.toLowerCase() })
  if (!user) {
    return res.json({ message: 'If this email is registered, a fresh activation link has been sent.' })
  }

  if (user.isEmailVerified) {
    return res.json({ message: 'This account is already activated. You can log in now.' })
  }

  const { plainToken, tokenHash } = generateActivationToken()
  user.activationTokenHash = tokenHash
  user.activationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await user.save()

  try {
    await sendActivationEmail({
      to: user.email,
      fullName: user.fullName,
      activationUrl: `${resolveBackendOrigin(req)}/api/auth/activate?token=${plainToken}`,
    })
  } catch (error) {
    return res.status(500).json({
      message:
        error instanceof Error
          ? `Failed to send activation email: ${error.message}`
          : 'Failed to send activation email.',
    })
  }

  return res.json({ message: 'A fresh activation link has been sent to your email.' })
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

  if (user.isEmailVerified === false) {
    return res.status(403).json({ message: 'Please activate your account via email before logging in.' })
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

authRoutes.get('/activate', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : ''
  if (!token) {
    return res.status(400).send(
      renderActivationPage({
        title: 'Invalid Activation Link',
        message: 'The activation link is missing required details. Please request a new link from the login page.',
        ctaLabel: 'Go to Login',
        ctaHref: env.clientOrigin,
        tone: 'error',
      }),
    )
  }

  const tokenHash = hashActivationToken(token)

  const user = await UserModel.findOne({
    activationTokenHash: tokenHash,
    activationTokenExpiresAt: { $gt: new Date() },
  })

  if (!user) {
    return res.status(400).send(
      renderActivationPage({
        title: 'Activation Link Expired',
        message: 'This link is invalid or has expired. Use the login page to resend a fresh activation email.',
        ctaLabel: 'Back to Login',
        ctaHref: env.clientOrigin,
        tone: 'error',
      }),
    )
  }

  user.isEmailVerified = true
  user.activationTokenHash = null
  user.activationTokenExpiresAt = null
  await user.save()

  return res.send(
    renderActivationPage({
      title: 'Account Activated Successfully',
      message: 'Your account is now active. Return to the app and log in to continue.',
      ctaLabel: 'Go to Login',
      ctaHref: env.clientOrigin,
      tone: 'success',
    }),
  )
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
