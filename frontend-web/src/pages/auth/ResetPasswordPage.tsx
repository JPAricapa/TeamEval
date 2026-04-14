import { useState, type FormEvent, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { GraduationCap, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/services/api'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) setError('Enlace inválido. Solicita uno nuevo.')
  }, [token])

  // Validaciones de contraseña en tiempo real
  const hasMin = password.length >= 8
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const passwordValid = hasMin && hasUpper && hasLower && hasNumber

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!passwordValid) { setError('La contraseña no cumple los requisitos'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }

    setError(''); setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Token inválido o expirado. Solicita un nuevo enlace.')
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
            Crea una nueva<br />contraseña segura
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            Elige una contraseña que no hayas usado antes y que sea difícil de adivinar.
          </p>
        </div>
        <p className="text-blue-300 text-sm">Plataforma de Evaluación Colaborativa</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">TeamEval</span>
        </div>

        <div className="w-full max-w-sm">
          {success ? (
            /* ── Estado: éxito ── */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">¡Contraseña restablecida!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Tu contraseña ha sido actualizada. Serás redirigido al inicio de sesión en unos segundos.
              </p>
              <Button className="w-full" onClick={() => navigate('/login')}>
                Ir al inicio de sesión
              </Button>
            </div>
          ) : !token ? (
            /* ── Token ausente ── */
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Enlace inválido</h2>
              <p className="text-gray-500 text-sm mb-6">
                Este enlace no es válido o ya fue utilizado.
              </p>
              <Link to="/forgot-password">
                <Button className="w-full">Solicitar nuevo enlace</Button>
              </Link>
            </div>
          ) : (
            /* ── Formulario ── */
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Nueva contraseña</h2>
              <p className="text-gray-500 text-sm mb-8">
                Ingresa y confirma tu nueva contraseña.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Nueva contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError('') }}
                      className="pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Requisitos */}
                  {password && (
                    <ul className="mt-2.5 space-y-1 pl-1">
                      <Req ok={hasMin}    label="Mínimo 8 caracteres" />
                      <Req ok={hasUpper}  label="Al menos una mayúscula" />
                      <Req ok={hasLower}  label="Al menos una minúscula" />
                      <Req ok={hasNumber} label="Al menos un número" />
                    </ul>
                  )}
                </div>

                {/* Confirmar contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setError('') }}
                      className={`pr-10 ${confirm && confirm !== password ? 'border-red-400 focus:ring-red-400' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !passwordValid || password !== confirm}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</>
                  ) : (
                    'Restablecer contraseña'
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
