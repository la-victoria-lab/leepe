'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogoutButtonProps {
  className?: string
  iconOnly?: boolean
}

export default function LogoutButton({ className, iconOnly = false }: LogoutButtonProps) {
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
      type="button"
      onClick={logout}
      disabled={isLoading}
      className={cn(
        'flex items-center justify-center transition-all duration-200 disabled:opacity-50',
        iconOnly
          ? 'h-9 w-9 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500'
          : 'text-xs font-semibold text-slate-500 hover:text-red-500 bg-transparent px-3 py-1 rounded-full hover:bg-red-50',
        className
      )}
      title="Cerrar sesión"
    >
      {iconOnly ? <LogOut className={cn('w-4 h-4', isLoading && 'animate-pulse')} /> : isLoading ? '...' : 'Salir'}
    </button>
  )
}
