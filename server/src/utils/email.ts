import sgMail from '@sendgrid/mail'
import { env } from '../config/env.js'

const sendgridConfigured = Boolean(env.sendgridApiKey)
export const isSmtpConfigured = sendgridConfigured

if (sendgridConfigured) {
  sgMail.setApiKey(env.sendgridApiKey as string)
}

export const sendActivationEmail = async (input: {
  to: string
  fullName: string
  activationUrl: string
}) => {
  if (!sendgridConfigured) {
    throw new Error('SendGrid is not configured on the server. Please set SENDGRID_API_KEY and EMAIL_FROM.')
  }

  await sgMail.send({
    from: env.emailFrom,
    to: input.to,
    subject: 'Activate your SJWC Youth Ministry account',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin-bottom: 10px;">Welcome, ${input.fullName}!</h2>
        <p>Your account has been created. Please activate it by clicking the button below:</p>
        <p style="margin: 20px 0;">
          <a href="${input.activationUrl}" style="background: #15803d; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 8px; display: inline-block; font-weight: 700;">Activate Account</a>
        </p>
        <p>If the button does not work, copy this link into your browser:</p>
        <p><a href="${input.activationUrl}">${input.activationUrl}</a></p>
        <p>This activation link expires in 24 hours.</p>
      </div>
    `,
  })
}
