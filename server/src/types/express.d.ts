import type { JwtPayload } from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload & { sub: string; role: 0 | 1 }
    }
  }
}

export {}
