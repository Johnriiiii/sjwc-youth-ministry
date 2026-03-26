import express from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User.js';
import { signToken } from '../utils/token.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { generateActivationToken, hashActivationToken } from '../utils/activation.js';
import { sendActivationEmail } from '../utils/email.js';
export const authRoutes = express.Router();
authRoutes.post('/signup', async (req, res) => {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
        return res.status(400).json({ message: 'fullName, email and password are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
        return res.status(409).json({ message: 'Email is already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const { plainToken, tokenHash } = generateActivationToken();
    const activationUrl = `${env.appBaseUrl}/api/auth/activate?token=${plainToken}`;
    const user = await UserModel.create({
        fullName,
        email: email.toLowerCase(),
        passwordHash,
        role: 0,
        isEmailVerified: false,
        activationTokenHash: tokenHash,
        activationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    try {
        await sendActivationEmail({
            to: user.email,
            fullName: user.fullName,
            activationUrl,
        });
    }
    catch (error) {
        await UserModel.findByIdAndDelete(user._id);
        return res.status(500).json({
            message: error instanceof Error
                ? `Account not created because activation email failed: ${error.message}`
                : 'Account not created because activation email failed.',
        });
    }
    return res.status(201).json({
        message: 'Account created. Please check your email for activation link before logging in.',
    });
});
authRoutes.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.isEmailVerified === false) {
        return res.status(403).json({ message: 'Please activate your account via email before logging in.' });
    }
    const token = signToken({
        sub: user._id.toString(),
        role: user.role === 1 ? 1 : 0,
        email: user.email,
    });
    return res.json({
        token,
        user: {
            id: user._id.toString(),
            fullName: user.fullName,
            email: user.email,
            role: user.role,
        },
    });
});
authRoutes.get('/activate', async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) {
        return res.status(400).send('<h3>Invalid activation link.</h3>');
    }
    const tokenHash = hashActivationToken(token);
    const user = await UserModel.findOne({
        activationTokenHash: tokenHash,
        activationTokenExpiresAt: { $gt: new Date() },
    });
    if (!user) {
        return res.status(400).send('<h3>Activation link is invalid or expired.</h3>');
    }
    user.isEmailVerified = true;
    user.activationTokenHash = null;
    user.activationTokenExpiresAt = null;
    await user.save();
    return res.send(`
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1f2937;">
      <h2>Account activated successfully!</h2>
      <p>You can now return to the app and log in.</p>
      <a href="${env.clientOrigin}" style="display:inline-block;margin-top:12px;padding:10px 14px;background:#15803d;color:#fff;text-decoration:none;border-radius:8px;">Go to Login</a>
    </div>
  `);
});
authRoutes.get('/me', requireAuth, async (req, res) => {
    const id = req.auth?.sub;
    if (!id)
        return res.status(401).json({ message: 'Unauthorized' });
    const user = await UserModel.findById(id).lean();
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    return res.json({
        user: {
            id: user._id.toString(),
            fullName: user.fullName,
            email: user.email,
            role: user.role,
        },
    });
});
