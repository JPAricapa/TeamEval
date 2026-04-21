import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatScore(score: number): string {
  return score.toFixed(2)
}

export function getScoreColor(score: number, max: number = 5): string {
  const pct = score / max
  if (pct >= 0.8) return 'text-emerald-600'
  if (pct >= 0.6) return 'text-blue-600'
  if (pct >= 0.4) return 'text-amber-600'
  return 'text-red-600'
}

export function getScoreBg(score: number, max: number = 5): string {
  const pct = score / max
  if (pct >= 0.8) return 'bg-emerald-50 border-emerald-200'
  if (pct >= 0.6) return 'bg-blue-50 border-blue-200'
  if (pct >= 0.4) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

export function toTitleCase(str: string): string {
  return str.toLowerCase().split(' ').map((w) => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')
}

export function getRoleName(role: string): string {
  const map: Record<string, string> = {
    ADMIN: 'Docente',
    TEACHER: 'Docente',
    STUDENT: 'Estudiante',
  }
  return map[role] ?? role
}

export function getRoleColor(role: string): string {
  const map: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-700',
    TEACHER: 'bg-blue-100 text-blue-700',
    STUDENT: 'bg-green-100 text-green-700',
  }
  return map[role] ?? 'bg-gray-100 text-gray-700'
}
