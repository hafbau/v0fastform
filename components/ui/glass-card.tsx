import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Glassmorphism card component with frosted glass effect.
 * Uses the .glass-card CSS utility for backdrop-blur and transparency.
 *
 * @example
 * ```tsx
 * <GlassCard>
 *   <GlassCardHeader>
 *     <GlassCardTitle>Welcome</GlassCardTitle>
 *     <GlassCardDescription>Sign in to continue</GlassCardDescription>
 *   </GlassCardHeader>
 *   <GlassCardContent>
 *     <form>...</form>
 *   </GlassCardContent>
 * </GlassCard>
 * ```
 */
function GlassCard({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="glass-card"
      data-testid="glass-card"
      className={cn(
        'glass-card flex flex-col gap-6 rounded-2xl py-6 text-foreground',
        className
      )}
      {...props}
    />
  )
}

function GlassCardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="glass-card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className
      )}
      {...props}
    />
  )
}

function GlassCardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="glass-card-title"
      className={cn('text-xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
}

function GlassCardDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="glass-card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function GlassCardContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="glass-card-content"
      className={cn('px-6', className)}
      {...props}
    />
  )
}

function GlassCardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="glass-card-footer"
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  )
}

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
}
