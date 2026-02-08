import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isAllowedCompanyEmail } from '@/lib/auth'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const nextPath = url.searchParams.get('next') || '/'

  if (!code) {
    return NextResponse.redirect(new URL('/login', url.origin))
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth] exchange code error', error)
    return NextResponse.redirect(new URL('/login', url.origin))
  }

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user?.email || !isAllowedCompanyEmail(user.email)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=domain', url.origin))
  }

  return NextResponse.redirect(new URL(nextPath, url.origin))
}


