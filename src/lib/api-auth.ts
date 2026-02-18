import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isAllowedCompanyEmail, isAdminEmail, adminEmails } from '@/lib/auth'
import { authLogger } from '@/lib/logger'

export async function requireCompanyUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { ok: false as const, response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  }

  if (!isAllowedCompanyEmail(user.email)) {
    await supabase.auth.signOut()
    return { ok: false as const, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  }

  return { ok: true as const, user, supabase }
}

export async function requireAdmin() {
  const auth = await requireCompanyUser()
  if (!auth.ok) return auth

  const userEmail = auth.user.email || ''
  if (!isAdminEmail(userEmail)) {
    authLogger.warn({ userEmail, adminEmails }, 'User is not admin')
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de administrador.' },
        { status: 403 }
      ),
    }
  }

  return auth
}
