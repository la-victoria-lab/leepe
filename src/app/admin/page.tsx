import { isAdminEmail, isAllowedCompanyEmail } from '@/lib/auth'

import AdminPageClient from '@/components/AdminPageClient'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

function getUserDisplayName(email: string, fullName: string | undefined | null) {
  const normalizedName = typeof fullName === 'string' ? fullName.trim() : ''
  if (normalizedName) return normalizedName
  return email.split('@')[0]
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login?next=/admin')
  if (!isAllowedCompanyEmail(user.email)) redirect('/login?error=domain')
  if (!isAdminEmail(user.email)) redirect('/user')

  const userName = getUserDisplayName(user.email, user.user_metadata?.full_name)

  return <AdminPageClient userName={userName} />
}
