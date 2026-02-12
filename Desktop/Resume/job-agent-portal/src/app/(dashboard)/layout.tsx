import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/login')
  }

  return <DashboardShell>{children}</DashboardShell>
}
