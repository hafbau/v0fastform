import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
}

interface LogoIconProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

/**
 * Text logo for fastform brand
 * Displays 'fastform' with a small primary-colored dot
 */
export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-baseline", className)}>
      <span className="text-2xl font-extrabold tracking-tight">fastform</span>
      <span className="ml-0.5 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
    </div>
  )
}

/**
 * Icon logo for fastform brand
 * Displays 'ff.' in a soft rounded square
 */
export function LogoIcon({ className, size = "md" }: LogoIconProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
  }

  const dotSizeClasses = {
    sm: "h-1 w-1",
    md: "h-1.5 w-1.5",
    lg: "h-2 w-2",
  }

  const [h, w, f] = (sizeClasses[size] || sizeClasses.md).split(" ")
  return (
    <div className={cn(
      "bg-primary/10 rounded-xl", h, w,
      "flex items-center justify-center",)}>
      <div
        className={cn(
          "flex items-baseline justify-center",
          "font-extrabold tracking-tighter text-foreground",
          f,
          className,
        )}
        aria-label="fastform"
      >
        <span>ff</span>
        <span className={cn(dotSizeClasses[size], "rounded-full bg-primary")} aria-hidden="true" />
      </div>
    </div>
  )
}

/**
 * Combined logo with icon and text
 */
export function LogoFull({ className }: LogoProps) {
  return (
    <div className={cn("inline-flex max-w-fit items-center gap-2.5", className)}>
      <LogoIcon size="md" />
      <Logo />
    </div>
  )
}
