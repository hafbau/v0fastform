import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '../auth'
import { AuthForm } from '@/components/auth-form'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
} from '@/components/ui/glass-card'

export default async function LoginPage() {
  const session = await auth()

  if (session) {
    redirect('/')
  }

  return (
    <GlassCard className="animate-in fade-in duration-500">
      <GlassCardHeader className="text-center">
        <GlassCardTitle>Welcome back</GlassCardTitle>
        <GlassCardDescription>
          Sign in to your account to continue
        </GlassCardDescription>
      </GlassCardHeader>

      <GlassCardContent>
        <AuthForm type="signin" />
      </GlassCardContent>

      <GlassCardFooter className="flex-col gap-4">
        <Link
          href="/forgot-password"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Forgot your password?
        </Link>
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </GlassCardFooter>
    </GlassCard>
  )
}
