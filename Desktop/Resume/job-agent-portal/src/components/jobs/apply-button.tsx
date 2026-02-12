'use client'

import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

interface ApplyButtonProps {
  url: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function ApplyButton({ url, variant = 'default', size = 'default', className }: ApplyButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
    >
      <ExternalLink className="mr-2 h-4 w-4" />
      Apply
    </Button>
  )
}
