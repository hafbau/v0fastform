import type React from "react"
import { Shield, Zap, Users, CheckCircle2 } from "lucide-react"
import { LogoFull } from "@/components/logo"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

const features = [
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "HIPAA-compliant with SOC 2 Type II certification",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Build forms 10x faster with AI-powered automation",
  },
  {
    icon: Users,
    title: "Trusted by Teams",
    description: "Used by 2,000+ healthcare organizations",
  },
]

const testimonial = {
  quote: "FastForm transformed how we collect patient data. What used to take weeks now takes hours.",
  author: "Dr. Sarah Chen",
  role: "Chief Digital Officer",
  company: "MedTech Health Systems",
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Brand/Marketing */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-primary relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative shapes */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary-foreground/10 blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-primary-foreground">
          <div
            className="p-4 rounded-2xl bg-primary-foreground/60 w-fit"
          >
            <LogoFull />
          </div>

          {/* Main content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight text-balance">
                Forms that work as hard as you do.
              </h1>
              <p className="text-lg xl:text-xl text-primary-foreground/80 max-w-md leading-relaxed">
                The enterprise form platform trusted by healthcare teams to collect, validate, and act on data faster
                than ever.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/20 backdrop-blur-sm">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-primary-foreground/70">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="space-y-4 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm p-6 border border-primary-foreground/10">
            <p className="text-lg italic leading-relaxed">"{testimonial.quote}"</p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center font-semibold">
                {testimonial.author
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <p className="font-semibold">{testimonial.author}</p>
                <p className="text-sm text-primary-foreground/70">
                  {testimonial.role}, {testimonial.company}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full lg:w-1/2 xl:w-[45%] flex-col">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <LogoFull />
        </div>

        {/* Form container */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12 xl:px-16">
          <div className="w-full max-w-md space-y-8">
            {/* Header */}
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">{title}</h2>
              <p className="text-muted-foreground">{subtitle}</p>
            </div>

            {/* Form Card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">{children}</div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>SOC 2 Type II</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>256-bit Encryption</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 text-center text-xs text-muted-foreground">
          <p>
            By continuing, you agree to our{" "}
            <a href="/terms" className="underline hover:text-foreground transition-colors">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline hover:text-foreground transition-colors">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
