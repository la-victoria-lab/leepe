'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { isAllowedCompanyEmail } from '@/lib/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const nextPath = searchParams.get('next') || '/'

      if (!code) {
        console.error('[auth] No code provided in callback')
        router.replace('/login?error=no_code')
        return
      }

      console.log('[auth] Processing OAuth callback with code')

      const supabase = createSupabaseBrowserClient()

      // Exchange the code for a session - this works on client side with localStorage
      const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[auth] Exchange code error:', exchangeError.message, exchangeError)
        setError(exchangeError.message)
        setTimeout(() => {
          router.replace('/login?error=exchange_failed')
        }, 2000)
        return
      }

      if (!sessionData?.session) {
        console.error('[auth] No session returned after exchange')
        router.replace('/login?error=no_session')
        return
      }

      console.log('[auth] Session created successfully')

      // Get user to verify email domain
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user?.email || !isAllowedCompanyEmail(user.email)) {
        console.error('[auth] Invalid email domain:', user?.email)
        await supabase.auth.signOut()
        router.replace('/login?error=domain')
        return
      }

      console.log('[auth] Login successful for:', user.email)

      // Redirect to next path
      router.replace(nextPath)
    }

    handleCallback()
  }, [searchParams, router])

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center p-6'>
        <div className='w-full max-w-md border rounded-xl p-6 bg-white shadow'>
          <h1 className='text-xl font-bold mb-2 text-red-600'>Error de autenticación</h1>
          <p className='text-gray-600 mb-4'>{error}</p>
          <p className='text-sm text-gray-500'>Redirigiendo al login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen flex items-center justify-center p-6'>
      <div className='w-full max-w-md border rounded-xl p-6 bg-white shadow'>
        <h1 className='text-xl font-bold mb-2'>Completando inicio de sesión...</h1>
        <p className='text-gray-600'>Un momento por favor</p>
        <div className='mt-4 flex justify-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
        </div>
      </div>
    </div>
  )
}
