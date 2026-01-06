'use client'

import { ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { AppNavbar, type AppNavbarProps } from './app-navbar'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  /** Page content to render below the navbar */
  children: ReactNode
  /** Custom navigation items (optional, defaults to Apps) */
  navItems?: AppNavbarProps['navItems']
  /** Additional CSS classes for the main content area */
  className?: string
  /** Whether to enforce authentication (redirects to login if not authenticated) */
  requireAuth?: boolean
}

/**
 * Comprehensive layout component for logged-in user interfaces.
 *
 * Features:
 * - Fixed top navigation bar with FastForm branding
 * - Centered navigation with 'Apps' link (customizable)
 * - User avatar with dropdown menu containing Log Out
 * - Responsive design for mobile and desktop
 * - Automatic padding to account for fixed navbar
 * - Optional authentication enforcement
 *
 * @example
 * ```tsx
 * // Basic usage in a page
 * export default function AppsPage() {
 *   return (
 *     <AppLayout>
 *       <div className="container mx-auto py-8">
 *         <h1>My Apps</h1>
 *       </div>
 *     </AppLayout>
 *   )
 * }
 *
 * // With custom navigation items
 * export default function DashboardPage() {
 *   return (
 *     <AppLayout
 *       navItems={[
 *         { label: 'Apps', href: '/apps' },
 *         { label: 'Settings', href: '/settings' },
 *       ]}
 *     >
 *       <DashboardContent />
 *     </AppLayout>
 *   )
 * }
 * ```
 */
export function AppLayout({
  children,
  navItems,
  className,
  requireAuth = true,
}: AppLayoutProps) {
  const { data: session, status } = useSession()

  // Handle authentication requirement
  if (requireAuth) {
    if (status === 'loading') {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )
    }

    if (status === 'unauthenticated' || !session) {
      redirect('/login')
    }
  }

  // Extract user info from session
  const user = {
    name: session?.user?.name,
    email: session?.user?.email,
    avatarUrl: session?.user?.image,
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar user={user} navItems={navItems} />

      {/* Main content area with top padding for fixed navbar */}
      <main className={cn('pt-16', className)}>
        {children}
      </main>
    </div>
  )
}

// Re-export components for convenience
export { AppNavbar } from './app-navbar'
export { UserAvatarMenu } from './user-avatar-menu'
export type { AppNavbarProps } from './app-navbar'
export type { UserAvatarMenuProps } from './user-avatar-menu'
