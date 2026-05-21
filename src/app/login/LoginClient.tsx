'use client'

import { allowedEmailDomain } from '@/lib/auth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useState } from 'react'
import { AlertCircle, BookOpen, Loader2 } from 'lucide-react'

type LoginClientProps = {
  nextPath: string
  errorCode: string
}

export default function LoginClient({ nextPath, errorCode }: LoginClientProps) {
  const [isLoading, setIsLoading] = useState(false)

  const errorMessage =
    errorCode === 'domain'
      ? `Solo se permite iniciar sesión con cuentas @${allowedEmailDomain}`
      : errorCode === 'config'
        ? 'Faltan variables de entorno de supabase en el deployment'
        : errorCode === 'middleware'
          ? 'Error interno en middleware, revisa logs de vercel'
          : errorCode === 'no_code'
            ? 'No se recibió código de autenticación. Intenta nuevamente.'
            : errorCode === 'exchange_failed'
              ? 'Error al intercambiar código de autenticación. Verifica la configuración de Supabase.'
              : errorCode === 'no_session'
                ? 'No se pudo crear la sesión. Intenta nuevamente o verifica tu navegador.'
                : ''

  const signInWithGoogle = async () => {
    setIsLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            hd: allowedEmailDomain,
            prompt: 'select_account',
          },
        },
      })

      if (error) {
        console.error('[auth] google sign in error', error)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('[auth] unexpected error', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-violet-200/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[50%] left-[55%] w-[300px] h-[300px] bg-pink-200/30 rounded-full blur-[80px] pointer-events-none" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Logo + Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 shadow-lg shadow-violet-200 mb-4">
            <BookOpen size={28} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">LEE(PE)</h1>
          <p className="text-slate-500 font-medium mt-1">Biblioteca La Victoria Lab</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-slate-200/60 border border-white">

          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-800">Iniciar sesión</h2>
            <p className="text-sm text-slate-500 mt-1">
              Usa tu cuenta <span className="font-semibold text-violet-600">@{allowedEmailDomain}</span>
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Google Button */}
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-700 active:scale-[0.98] text-white font-bold text-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-slate-300"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Redirigiendo...
              </>
            ) : (
              <>
                {/* Google icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar con Google
              </>
            )}
          </button>

          <p className="mt-5 text-xs text-slate-400 text-center leading-relaxed">
            Acceso restringido a cuentas corporativas<br />de La Victoria Lab
          </p>
        </div>
      </div>
    </div>
  )
}
