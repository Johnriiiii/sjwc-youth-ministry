import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../utils/token.js'

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization token' })
  }

  const token = header.slice('Bearer '.length)
  try {
    const payload = verifyToken(token)
    req.auth = payload as Request['auth']
    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.auth || req.auth.role !== 1) {
    return res.status(403).json({ message: 'Admin access required' })
  }
  return next()
}
