'use client'

import { allowedEmailDomain } from '@/lib/auth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useState } from 'react'

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
          : ''

  const signInWithGoogle = async () => {
    setIsLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            hd: allowedEmailDomain,
            prompt: 'select_account'
          }
        }
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
    <div className='min-h-screen flex items-center justify-center p-6'>
      <div className='w-full max-w-md border rounded-xl p-6 bg-white shadow'>
        <h1 className='text-2xl font-bold mb-2'>Iniciar sesión</h1>
        <p className='text-gray-600 mb-6'>
          Usa tu cuenta corporativa @{allowedEmailDomain}
        </p>

        {errorMessage && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm'>
            {errorMessage}
          </div>
        )}

        <button
          type='button'
          onClick={signInWithGoogle}
          disabled={isLoading}
          className='w-full px-5 py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:bg-gray-400'
        >
          {isLoading ? 'Redirigiendo...' : 'Continuar con Google'}
        </button>

        <p className='mt-4 text-xs text-gray-500'>
          Al continuar aceptas iniciar sesión con tu cuenta corporativa
        </p>
      </div>
    </div>
  )
}


