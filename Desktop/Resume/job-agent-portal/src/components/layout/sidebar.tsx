'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Briefcase,
  UserCircle,
  ClipboardList,
  FileText,
  MessageSquare,
  Settings,
  Search,
  Home,
  Mail,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
  { name: 'Search Profiles', href: '/dashboard/profiles', icon: UserCircle },
  { name: 'Application Tracker', href: '/dashboard/tracker', icon: ClipboardList },
  { name: 'Resumes', href: '/dashboard/resumes', icon: FileText },
  { name: 'Recruiter Outreach', href: '/dashboard/outreach', icon: Mail },
  { name: 'AI Chat', href: '/dashboard/chat', icon: MessageSquare },
]

const secondaryNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/10">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Search className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">Job Agent</span>
        </Link>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  isActive && 'bg-secondary font-medium'
                )}
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Secondary Navigation */}
      <div className="border-t p-4">
        {secondaryNavigation.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  isActive && 'bg-secondary font-medium'
                )}
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
