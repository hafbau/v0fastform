'use server'

import { z } from 'zod'
import crypto from 'crypto'
import { signIn } from './auth'
import {
  createUser,
  getUser,
  createPasswordResetToken,
  getPasswordResetToken,
  deletePasswordResetToken,
  updateUserPassword,
} from '@/lib/db/queries'
import { sendPasswordResetEmail, isSmtpConfigured } from '@/lib/email/password-reset'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { AuthError } from 'next-auth'

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email.'),
  password: z.string().min(1, 'Password is required.'),
})

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})

interface ActionResult {
  type: 'error' | 'success'
  message: string
}

export async function signInAction(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const validatedData = signInSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    })

    const result = await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    })

    if (result?.error) {
      return {
        type: 'error',
        message: 'Invalid credentials. Please try again.',
      }
    }

    revalidatePath('/')
    redirect('/?refresh=session')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        type: 'error',
        message: error.issues[0].message,
      }
    }

    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return {
            type: 'error',
            message: 'Invalid credentials. Please try again.',
          }
        default:
          return {
            type: 'error',
            message: 'Something went wrong. Please try again.',
          }
      }
    }

    // If it's a redirect, re-throw it
    throw error
  }
}

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email.'),
})

export async function requestPasswordReset(
  email: string,
): Promise<ActionResult> {
  try {
    const validated = forgotPasswordSchema.parse({ email })

    // Check if user exists (don't reveal if they don't for security)
    const existingUsers = await getUser(validated.email)

    if (existingUsers.length > 0) {
      // Generate a secure random token
      const token = crypto.randomBytes(32).toString('hex')

      // Store token in database (expires in 1 hour)
      await createPasswordResetToken({
        email: validated.email,
        token,
        expiresInHours: 1,
      })

      // Send email if SMTP is configured
      if (isSmtpConfigured()) {
        await sendPasswordResetEmail({
          email: validated.email,
          token,
        })
      } else {
        // In development, log the reset link
        console.log(
          '[Password Reset] SMTP not configured. Reset link:',
          `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`
        )
      }
    }

    // Always return success to prevent email enumeration
    return {
      type: 'success',
      message: 'If an account exists, you will receive a password reset email.',
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        type: 'error',
        message: error.issues[0].message,
      }
    }

    console.error('[Password Reset] Error:', error)
    return {
      type: 'error',
      message: 'Something went wrong. Please try again.',
    }
  }
}

export async function signUpAction(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const validatedData = signUpSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    })

    const existingUsers = await getUser(validatedData.email)

    if (existingUsers.length > 0) {
      return {
        type: 'error',
        message: 'User already exists. Please sign in instead.',
      }
    }

    await createUser(validatedData.email, validatedData.password)

    const result = await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    })

    if (result?.error) {
      return {
        type: 'error',
        message:
          'Failed to sign in after registration. Please try signing in manually.',
      }
    }

    revalidatePath('/')
    redirect('/?refresh=session')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        type: 'error',
        message: error.issues[0].message,
      }
    }

    if (error instanceof AuthError) {
      return {
        type: 'error',
        message: 'Something went wrong. Please try again.',
      }
    }

    // If it's a redirect, re-throw it
    throw error
  }
}

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})

export async function validateResetToken(
  token: string,
): Promise<ActionResult> {
  if (!token) {
    return {
      type: 'error',
      message: 'No reset token provided.',
    }
  }

  try {
    const tokenRecord = await getPasswordResetToken({ token })

    if (!tokenRecord) {
      return {
        type: 'error',
        message: 'Invalid or expired reset link.',
      }
    }

    return {
      type: 'success',
      message: 'Token is valid.',
    }
  } catch (error) {
    console.error('[Password Reset] Token validation error:', error)
    return {
      type: 'error',
      message: 'Something went wrong. Please try again.',
    }
  }
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<ActionResult> {
  try {
    const validated = resetPasswordSchema.parse({ token, password: newPassword })

    // Get and validate the token
    const tokenRecord = await getPasswordResetToken({ token: validated.token })

    if (!tokenRecord) {
      return {
        type: 'error',
        message: 'Invalid or expired reset link.',
      }
    }

    // Update the user's password
    const user = await updateUserPassword({
      email: tokenRecord.identifier,
      password: validated.password,
    })

    if (!user) {
      return {
        type: 'error',
        message: 'Failed to update password. Please try again.',
      }
    }

    // Delete the used token
    await deletePasswordResetToken({ token: validated.token })

    return {
      type: 'success',
      message: 'Password has been reset successfully.',
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        type: 'error',
        message: error.issues[0].message,
      }
    }

    console.error('[Password Reset] Error:', error)
    return {
      type: 'error',
      message: 'Something went wrong. Please try again.',
    }
  }
}
