import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, ArrowLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/services/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Ingresa tu correo electrónico'); return }
    setError(''); setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch {
      setError('Ocurrió un error. Intenta de nuevo más tarde.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel – branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-blue-800 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xl font-bold">TeamEval</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Recupera el acceso<br />a tu cuenta
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            Te enviaremos un enlace seguro a tu correo para que puedas establecer una nueva contraseña.
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
          {/* Back link */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </Link>

          {sent ? (
            /* ── Estado: enviado ── */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Revisa tu correo</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Si <span className="font-medium text-gray-700">{email}</span> está registrado,
                recibirás en breve un enlace para restablecer tu contraseña.
                Recuerda revisar tu carpeta de spam.
              </p>
              <p className="text-xs text-gray-400 mb-6">El enlace expira en 1 hora.</p>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                Intentar con otro correo
              </Button>
            </div>
          ) : (
            /* ── Formulario ── */
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¿Olvidaste tu contraseña?</h2>
              <p className="text-gray-500 text-sm mb-8">
                Escribe tu correo y te enviaremos un enlace para recuperarla.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="usuario@institucion.edu.co"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</>
                  ) : (
                    'Enviar enlace de recuperación'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
