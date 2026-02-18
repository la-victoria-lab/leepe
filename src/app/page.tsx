import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getRoleForEmail, isAllowedCompanyEmail } from '@/lib/auth'

export default async function Home() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  if (!isAllowedCompanyEmail(user.email)) {
    redirect('/login?error=domain')
  }

  const role = getRoleForEmail(user.email)
  redirect(role === 'admin' ? '/admin' : '/user')
}
