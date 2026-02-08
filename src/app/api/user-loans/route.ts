import { NextResponse } from 'next/server'
import { requireCompanyUser } from '@/lib/api-auth'

function getBorrowerLabel(email: string, fullName: string | undefined | null) {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedName = typeof fullName === 'string' ? fullName.trim() : ''
  return normalizedName || normalizedEmail
}

export async function GET() {
  try {
    const auth = await requireCompanyUser()
    if (!auth.ok) return auth.response

    const borrower = getBorrowerLabel(auth.user.email!, auth.user.user_metadata?.full_name)

    const { data: prestamos, error } = await auth.supabase
      .from('prestamos')
      .select(`
        *,
        libros (titulo, autores, thumbnail)
      `)
      .eq('persona', borrower)
      .eq('devuelto', false)
      .order('fecha_prestamo', { ascending: false })

    if (error) {
      console.error('[user-loans] Database error:', error)
      return NextResponse.json(
        { error: 'error al obtener préstamos' },
        { status: 500 }
      )
    }

    return NextResponse.json(prestamos || [])
  } catch (error) {
    console.error('[user-loans] Error:', error)
    return NextResponse.json(
      { error: 'error al obtener préstamos' },
      { status: 500 }
    )
  }
}

