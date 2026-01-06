'use client'

import { signOut } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut } from 'lucide-react'

export interface UserAvatarMenuProps {
  /** User's display name */
  name?: string | null
  /** User's email address */
  email?: string | null
  /** URL for the user's avatar image */
  avatarUrl?: string | null
}

/**
 * User avatar with dropdown menu for logged-in users.
 * Displays the user's avatar image with a fallback to initials.
 * Clicking opens a dropdown with account options.
 */
export function UserAvatarMenu({ name, email, avatarUrl }: UserAvatarMenuProps) {
  // Generate initials from name or email
  const getInitials = () => {
    if (name) {
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      }
      return name.slice(0, 2).toUpperCase()
    }
    if (email) {
      return email.split('@')[0]?.slice(0, 2)?.toUpperCase() || 'U'
    }
    return 'U'
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/', redirect: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Open user menu"
        >
          <Avatar className="h-9 w-9">
            {avatarUrl && (
              <AvatarImage
                src={avatarUrl}
                alt={name || email || 'User avatar'}
              />
            )}
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48"
        align="end"
        sideOffset={8}
        forceMount
      >
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
