import dotenv from 'dotenv'

dotenv.config()

const required = ['MONGODB_URI', 'JWT_SECRET'] as const

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`)
  }
})

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI as string,
  jwtSecret: process.env.JWT_SECRET as string,
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  appBaseUrl:
    process.env.APP_BASE_URL ??
    process.env.BASE_URL ??
    process.env.CLIENT_ORIGIN ??
    'http://localhost:5173',
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? process.env.SENDGRID_KEY,
  emailFrom: process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? 'SJWC Youth Ministry <no-reply@sjwc-youth.local>',
}
