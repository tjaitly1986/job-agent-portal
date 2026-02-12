import { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SectionProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Section({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: SectionProps) {
  return (
    <Card className={cn('p-6', className)}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-6 w-6 text-primary" />}
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </Card>
  )
}
