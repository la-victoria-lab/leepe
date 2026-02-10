import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isAllowedCompanyEmail } from '@/lib/auth'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const nextPath = url.searchParams.get('next') || '/'

  if (!code) {
    console.error('[auth] No code provided in callback')
    return NextResponse.redirect(new URL('/login?error=no_code', url.origin))
  }

  const supabase = await createSupabaseServerClient()
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth] Exchange code error:', error.message, error)
    return NextResponse.redirect(new URL(`/login?error=exchange_failed`, url.origin))
  }

  if (!sessionData?.session) {
    console.error('[auth] No session returned after exchange')
    return NextResponse.redirect(new URL('/login?error=no_session', url.origin))
  }

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user?.email || !isAllowedCompanyEmail(user.email)) {
    console.error('[auth] Invalid email domain:', user?.email)
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=domain', url.origin))
  }

  console.log('[auth] Login successful for:', user.email)

  // Create response with explicit redirect
  const response = NextResponse.redirect(new URL(nextPath, url.origin))

  return response
}


