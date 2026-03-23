import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

type TokenPayload = {
  sub: string
  role: 0 | 1
  email: string
}

export const signToken = (payload: TokenPayload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' })

export const verifyToken = (token: string) => jwt.verify(token, env.jwtSecret)
