'use client'

import { cn } from '@/lib/utils'

export interface GradientMeshProps {
  /** Additional CSS classes */
  className?: string
  /** Whether to use subtle or vibrant colors */
  intensity?: 'subtle' | 'medium' | 'vibrant'
}

/**
 * Animated gradient mesh background component.
 * Uses CSS animations for smooth, performant gradients.
 * Supports light and dark modes via CSS custom properties.
 *
 * @example
 * ```tsx
 * <GradientMesh className="fixed inset-0 -z-10" />
 * ```
 */
export function GradientMesh({
  className,
  intensity = 'subtle',
}: GradientMeshProps) {
  const intensityClasses = {
    subtle: 'opacity-40 dark:opacity-30',
    medium: 'opacity-60 dark:opacity-50',
    vibrant: 'opacity-80 dark:opacity-70',
  }

  return (
    <div
      data-testid="gradient-mesh"
      className={cn(
        'pointer-events-none select-none overflow-hidden',
        intensityClasses[intensity],
        className
      )}
      aria-hidden="true"
    >
      {/* Primary gradient blob - teal */}
      <div
        className={cn(
          'absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full',
          'bg-gradient-to-br from-primary/60 via-primary/40 to-transparent',
          'blur-3xl animate-mesh-float'
        )}
      />

      {/* Secondary gradient blob - coral accent */}
      <div
        className={cn(
          'absolute -right-1/4 top-1/4 h-[500px] w-[500px] rounded-full',
          'bg-gradient-to-bl from-accent/50 via-accent/30 to-transparent',
          'blur-3xl animate-mesh-float-delayed'
        )}
      />

      {/* Tertiary gradient blob - mixed */}
      <div
        className={cn(
          'absolute -bottom-1/4 left-1/3 h-[550px] w-[550px] rounded-full',
          'bg-gradient-to-tr from-primary/40 via-accent/20 to-transparent',
          'blur-3xl animate-mesh-float-slow'
        )}
      />

      {/* Subtle overlay for depth */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-b from-background/0 via-background/20 to-background/60'
        )}
      />
    </div>
  )
}
