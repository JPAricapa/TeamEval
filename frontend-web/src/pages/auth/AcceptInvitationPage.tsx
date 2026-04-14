import { useState, type FormEvent, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { GraduationCap, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [done, setDone]             = useState(false)

  useEffect(() => {
    if (!token) setError('Enlace de invitación inválido.')
  }, [token])

  // Validaciones en tiempo real
  const hasMin    = password.length >= 8
  const hasUpper  = /[A-Z]/.test(password)
  const hasLower  = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const pwdValid  = hasMin && hasUpper && hasLower && hasNumber
  const matches   = password === confirm && confirm.length > 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token || !pwdValid || !matches) return
    setError(''); setLoading(true)
    try {
      const { data } = await authApi.acceptInvitation(token, password)
      const { user, accessToken, refreshToken } = data.data
      setAuth(user, accessToken, refreshToken)
      setDone(true)
      // Redirigir automáticamente al dashboard según rol
      setTimeout(() => {
        if (user.role === 'ADMIN') navigate('/admin')
        else if (user.role === 'TEACHER') navigate('/teacher')
        else navigate('/student')
      }, 2500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Enlace inválido o expirado. Contacta al administrador.')
    } finally {
      setLoading(false)
    }
  }

  const Req = ({ ok, label }: { ok: boolean; label: string }) => (
    <li className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold
        ${ok ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
        {ok ? '✓' : '·'}
      </span>
      {label}
    </li>
  )

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-blue-800 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xl font-bold">TeamEval</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Activa tu cuenta<br />y comienza
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            Crea tu contraseña para acceder a la plataforma de evaluación de trabajo en equipo.
          </p>
        </div>
        <p className="text-blue-300 text-sm">Plataforma de Evaluación Colaborativa</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
        <div className="flex lg:hidden items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">TeamEval</span>
        </div>

        <div className="w-full max-w-sm">
          {done ? (
            /* ── Éxito ── */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">¡Cuenta activada!</h2>
              <p className="text-gray-500 text-sm mb-2">Bienvenido a TeamEval. Serás redirigido a tu dashboard en unos segundos.</p>
            </div>
          ) : !token ? (
            /* ── Token inválido ── */
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Enlace inválido</h2>
              <p className="text-gray-500 text-sm mb-6">
                Este enlace no es válido o ya fue utilizado. Contacta al administrador para recibir una nueva invitación.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full">Ir al inicio de sesión</Button>
              </Link>
            </div>
          ) : (
            /* ── Formulario ── */
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Activa tu cuenta</h2>
              <p className="text-gray-500 text-sm mb-8">
                Crea una contraseña para completar el registro y acceder a la plataforma.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Crear contraseña
                  </label>
                  <div className="relative">
                    <Input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      className="pr-10"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <ul className="mt-2.5 space-y-1 pl-1">
                      <Req ok={hasMin}    label="Mínimo 8 caracteres" />
                      <Req ok={hasUpper}  label="Al menos una mayúscula" />
                      <Req ok={hasLower}  label="Al menos una minúscula" />
                      <Req ok={hasNumber} label="Al menos un número" />
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError('') }}
                      className={`pr-10 ${confirm && !matches ? 'border-red-400 focus:ring-red-400' : ''}`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirm && !matches && (
                    <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading || !pwdValid || !matches}>
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Activando cuenta...</>
                    : 'Activar cuenta'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
