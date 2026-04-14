import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red'
  trend?: { value: number; label: string }
  className?: string
}

const colorMap = {
  blue: { bg: 'bg-blue-50', icon: 'bg-blue-500', text: 'text-blue-500' },
  green: { bg: 'bg-emerald-50', icon: 'bg-emerald-500', text: 'text-emerald-500' },
  amber: { bg: 'bg-amber-50', icon: 'bg-amber-500', text: 'text-amber-500' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-500', text: 'text-purple-500' },
  red: { bg: 'bg-red-50', icon: 'bg-red-500', text: 'text-red-500' },
}

export function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend, className }: StatCardProps) {
  const colors = colorMap[color]

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4', className)}>
      <div className={cn('w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0', colors.bg)}>
        <Icon className={cn('w-5 h-5', colors.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        {trend && (
          <p className={cn('text-xs mt-1 font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  )
}
