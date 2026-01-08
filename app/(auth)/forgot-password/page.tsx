'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
} from '@/components/ui/glass-card'
import { requestPasswordReset } from '../actions'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const result = await requestPasswordReset(email)

    setIsLoading(false)

    if (result.type === 'error') {
      setError(result.message)
    } else {
      setIsSubmitted(true)
    }
  }

  if (isSubmitted) {
    return (
      <GlassCard className="animate-in fade-in duration-500">
        <GlassCardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <GlassCardTitle>Check your email</GlassCardTitle>
          <GlassCardDescription>
            If an account exists for {email}, you&apos;ll receive a password
            reset link shortly.
          </GlassCardDescription>
        </GlassCardHeader>

        <GlassCardFooter className="justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </GlassCardFooter>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="animate-in fade-in duration-500">
      <GlassCardHeader className="text-center">
        <GlassCardTitle>Forgot password?</GlassCardTitle>
        <GlassCardDescription>
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </GlassCardDescription>
      </GlassCardHeader>

      <GlassCardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>
      </GlassCardContent>

      <GlassCardFooter className="justify-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </GlassCardFooter>
    </GlassCard>
  )
}
