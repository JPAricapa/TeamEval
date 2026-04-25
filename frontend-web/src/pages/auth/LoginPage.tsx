import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const performanceSegments = [
  { label: 'Participación', value: 42, color: 'bg-cyan-300', stroke: '#67e8f9' },
  { label: 'Avance académico', value: 31, color: 'bg-blue-300', stroke: '#93c5fd' },
  { label: 'Retroalimentación', value: 27, color: 'bg-emerald-300', stroke: '#6ee7b7' },
]

const activityTrend = [54, 68, 62, 78, 86, 92]

const chartRadius = 72
const chartCircumference = 2 * Math.PI * chartRadius
let chartOffset = 0
const chartSegments = performanceSegments.map((item) => {
  const segment = {
    ...item,
    dashLength: (item.value / 100) * chartCircumference,
    dashOffset: (chartOffset / 100) * chartCircumference,
  }
  chartOffset += item.value
  return segment
})

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Complete todos los campos'); return }
    setError(''); setLoading(true)
    try {
      const { data } = await authApi.login(email, password)
      const { user, accessToken, refreshToken } = data.data
      setAuth(user, accessToken, refreshToken)
      if (user.role === 'ADMIN') navigate('/admin/users')
      else if (user.role === 'TEACHER') navigate('/teacher')
      else navigate('/student')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Credenciales incorrectas. Intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-gray-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(8,145,178,0.16),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(37,99,235,0.12),transparent_25%),linear-gradient(135deg,#f8fafc_0%,#eef6fb_50%,#f7fbf9_100%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-8">
        {/* Left panel - academic context */}
        <section className="relative hidden overflow-hidden rounded-3xl border border-white/25 bg-slate-950 shadow-2xl shadow-slate-900/20 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(14,64,105,0.92)_50%,rgba(12,74,110,0.95))]" />
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-400/18 blur-3xl" />
          <div className="absolute bottom-[-6rem] left-[-4rem] h-80 w-80 rounded-full bg-blue-500/18 blur-3xl" />
          <div className="absolute inset-x-12 top-24 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="absolute inset-y-0 right-24 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

          <div className="relative z-10 flex items-center justify-between p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20 shadow-lg shadow-cyan-950/20">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight text-white">TeamEval</p>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-100/70">
                  Plataforma académica
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-cyan-50">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.9)]" />
              Acceso institucional
            </div>
          </div>

          <div className="relative z-10 px-10 pb-8">
            <div className="max-w-xl">
              <p className="mb-4 inline-flex rounded-full border border-cyan-200/20 bg-cyan-100/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                Evaluación colaborativa
              </p>
              <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white xl:text-5xl">
                Seguimiento del desempeño estudiantil.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-200">
                Visualiza avances, participación y resultados para acompañar mejor cada proceso
                formativo.
              </p>
            </div>

            <div className="mt-10 rounded-3xl border border-white/12 bg-white/[0.08] p-6 shadow-2xl shadow-slate-950/20 backdrop-blur">
              <div className="flex items-center justify-between gap-6">
                <div className="relative flex h-44 w-44 shrink-0 items-center justify-center rounded-full shadow-2xl shadow-cyan-950/30">
                  <svg
                    viewBox="0 0 176 176"
                    className="absolute inset-0 h-full w-full -rotate-90"
                    role="img"
                    aria-label="Distribución del desempeño: participación 42%, avance académico 31%, retroalimentación 27%"
                  >
                    <circle
                      cx="88"
                      cy="88"
                      r={chartRadius}
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="20"
                    />
                    {chartSegments.map((item) => (
                      <circle
                        key={item.label}
                        cx="88"
                        cy="88"
                        r={chartRadius}
                        fill="none"
                        stroke={item.stroke}
                        strokeWidth="20"
                        strokeDasharray={`${item.dashLength} ${chartCircumference}`}
                        strokeDashoffset={-item.dashOffset}
                        strokeLinecap="round"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-4 rounded-full border border-white/20 bg-slate-950/90 shadow-inner shadow-slate-950" />
                  <div className="relative text-center">
                    <p className="text-3xl font-bold text-white">92%</p>
                    <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                      Activo
                    </p>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
                      Vista de desempeño
                    </p>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/12 px-2.5 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-200/20">
                      <TrendingUp className="h-3.5 w-3.5" />
                      +14%
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {performanceSegments.map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`h-3 w-3 shrink-0 rounded-full ${item.color}`} />
                          <span className="truncate text-sm font-medium text-slate-100">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-white">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-[1fr_auto] items-end gap-6 border-t border-white/10 pt-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    Actividad semanal
                  </div>
                  <div className="mt-4 flex h-20 items-end gap-2">
                    {activityTrend.map((height, index) => (
                      <div
                        key={`${height}-${index}`}
                        className="flex flex-1 items-end rounded-t-lg bg-white/8"
                        aria-label={`Semana ${index + 1}: ${height}% de actividad`}
                      >
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-cyan-400 to-emerald-300 shadow-[0_0_18px_rgba(103,232,249,0.28)]"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-right">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                    Ciclo
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">2026</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 h-10" />
        </section>

        {/* Right panel - form */}
        <main className="flex flex-1 items-center justify-center py-8 lg:py-0 lg:pl-10">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight text-gray-950">TeamEval</p>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  Plataforma académica
                </p>
              </div>
            </div>

            <div className="mb-7">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/85 px-3 py-1 text-xs font-semibold text-primary shadow-sm shadow-sky-950/5">
                <LockKeyhole className="h-3.5 w-3.5" />
                Ingreso seguro
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
                Iniciar sesión
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Ingresa con tus credenciales institucionales para continuar a tu panel.
              </p>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/92 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Correo electrónico
                  </label>
                  <Input
                    type="email"
                    placeholder="usuario@universidad.edu.co"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading}
                    className="h-12 rounded-xl border-gray-200 bg-gray-50/70 px-4 shadow-inner shadow-gray-950/[0.02] transition-all placeholder:text-gray-400 focus-visible:bg-white focus-visible:ring-cyan-500/30 disabled:bg-gray-100"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      disabled={loading}
                      className="h-12 rounded-xl border-gray-200 bg-gray-50/70 px-4 pr-12 shadow-inner shadow-gray-950/[0.02] transition-all placeholder:text-gray-400 focus-visible:bg-white focus-visible:ring-cyan-500/30 disabled:bg-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 disabled:pointer-events-none disabled:opacity-50"
                      disabled={loading}
                      aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl text-base shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 disabled:translate-y-0"
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</>
                  ) : (
                    'Ingresar'
                  )}
                </Button>
              </form>

              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm leading-5 text-slate-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  Tus datos se validan con tokens de sesión y acceso por rol antes de abrir el
                  panel correspondiente.
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-gray-500">
              Plataforma de Evaluación Colaborativa para entornos académicos.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
