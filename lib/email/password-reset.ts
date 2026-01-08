import nodemailer from 'nodemailer'

/**
 * Check if SMTP is configured
 */
export function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  )
}

/**
 * Get SMTP transport for sending emails
 */
function getTransport() {
  if (!isSmtpConfigured()) {
    return null
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({
  email,
  token,
}: {
  email: string
  token: string
}): Promise<{ success: boolean; error?: string }> {
  const transport = getTransport()

  if (!transport) {
    console.warn('[Email] SMTP not configured, skipping password reset email')
    return {
      success: false,
      error: 'Email service not configured',
    }
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 560px;
      margin: 40px auto;
      padding: 40px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      color: #0d9488;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }
    p {
      margin: 0 0 16px 0;
      color: #4a4a4a;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #0d9488;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      margin: 24px 0;
    }
    .button:hover {
      background-color: #0f766e;
    }
    .link {
      word-break: break-all;
      color: #0d9488;
      font-size: 14px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e5e5;
      font-size: 13px;
      color: #6b7280;
    }
    .note {
      background-color: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <span class="logo-text">FastForm</span>
    </div>

    <h1>Reset your password</h1>

    <p>
      We received a request to reset the password for your FastForm account.
      Click the button below to create a new password.
    </p>

    <a href="${resetUrl}" class="button">Reset Password</a>

    <p>Or copy and paste this link in your browser:</p>
    <p class="link">${resetUrl}</p>

    <div class="note">
      <strong>Note:</strong> This link will expire in 1 hour. If you didn't request
      a password reset, you can safely ignore this email.
    </div>

    <div class="footer">
      <p>
        This email was sent by FastForm. If you have any questions,
        please contact our support team.
      </p>
    </div>
  </div>
</body>
</html>
`

  const text = `
Reset your password

We received a request to reset the password for your FastForm account.

Click this link to create a new password:
${resetUrl}

Note: This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

---
FastForm
`

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Reset your FastForm password',
      text,
      html,
    })

    return { success: true }
  } catch (error) {
    console.error('[Email] Failed to send password reset email:', error)
    return {
      success: false,
      error: 'Failed to send email',
    }
  }
}
