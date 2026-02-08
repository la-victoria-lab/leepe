import UserPageClient from '@/components/UserPageClient'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isAllowedCompanyEmail } from '@/lib/auth'

function getUserDisplayName(email: string, fullName: string | undefined | null) {
  const normalizedName = typeof fullName === 'string' ? fullName.trim() : ''
  if (normalizedName) return normalizedName
  return email.split('@')[0]
}

export default async function UserPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login?next=/user')
  if (!isAllowedCompanyEmail(user.email)) redirect('/login?error=domain')

  const userName = getUserDisplayName(user.email, user.user_metadata?.full_name)

  return (
    <UserPageClient userName={userName} />
  )
}


