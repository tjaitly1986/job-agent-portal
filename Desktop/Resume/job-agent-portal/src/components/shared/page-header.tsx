import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageHeaderProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
}

export function PageHeader({ icon: Icon, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-8 w-8 text-primary" />}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action && (
        <Button onClick={action.onClick}>
          {action.icon && <action.icon className="mr-2 h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  )
}
