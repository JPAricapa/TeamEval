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
  blue: { bg: 'bg-sky-50', ring: 'ring-sky-100', text: 'text-sky-700' },
  green: { bg: 'bg-emerald-50', ring: 'ring-emerald-100', text: 'text-emerald-700' },
  amber: { bg: 'bg-amber-50', ring: 'ring-amber-100', text: 'text-amber-700' },
  purple: { bg: 'bg-indigo-50', ring: 'ring-indigo-100', text: 'text-indigo-700' },
  red: { bg: 'bg-red-50', ring: 'ring-red-100', text: 'text-red-700' },
}

export function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend, className }: StatCardProps) {
  const colors = colorMap[color]

  return (
    <div className={cn('group flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm shadow-gray-950/[0.03] transition-colors hover:border-gray-300', className)}>
      <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md ring-1', colors.bg, colors.ring)}>
        <Icon className={cn('w-5 h-5', colors.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-gray-950">{value}</p>
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
