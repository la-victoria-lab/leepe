'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false)

  const logout = async () => {
    setIsLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
      window.location.href = '/login'
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      type='button'
      onClick={logout}
      disabled={isLoading}
      className='text-xs font-medium text-gray-500 hover:text-red-600 active:text-red-700 disabled:text-gray-300 transition-colors touch-manipulation'
    >
      {isLoading ? 'Saliendo...' : 'Cerrar sesión'}
    </button>
  )
}


