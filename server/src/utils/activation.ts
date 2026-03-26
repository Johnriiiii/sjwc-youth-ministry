import crypto from 'crypto'

const TOKEN_BYTES = 32

export const generateActivationToken = () => {
  const plainToken = crypto.randomBytes(TOKEN_BYTES).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex')
  return { plainToken, tokenHash }
}

export const hashActivationToken = (plainToken: string) =>
  crypto.createHash('sha256').update(plainToken).digest('hex')
