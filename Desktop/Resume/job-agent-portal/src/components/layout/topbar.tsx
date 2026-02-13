'use client'

import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Bell, LogOut, User } from 'lucide-react'

export function Topbar() {
  const { data: session } = useSession()

  return (
    <div className="flex h-16 items-center justify-between border-b px-6">
      {/* Left side - could add breadcrumbs or page title */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Job Agent Portal</h2>
      </div>

      {/* Right side - user menu */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{session?.user?.name || 'User'}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
