import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  label?: string
  className?: string
}

export function LoadingState({ label = 'Cargando información...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex min-h-48 flex-col items-center justify-center gap-3 text-sm text-gray-500', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span>{label}</span>
    </div>
  )
}
