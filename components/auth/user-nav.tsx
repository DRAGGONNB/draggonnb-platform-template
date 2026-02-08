'use client'

import { User } from '@supabase/supabase-js'
import { LogoutButton } from './logout-button'

interface UserNavProps {
  user: User
}

export function UserNav({ user }: UserNavProps) {
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const email = user.email || ''

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-end">
        <p className="text-sm font-medium leading-none">{displayName}</p>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>
      <LogoutButton />
    </div>
  )
}
