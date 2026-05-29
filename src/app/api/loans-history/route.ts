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

    // Obtener los préstamos del usuario actual
    const { data: prestamos, error } = await auth.supabase
      .from('prestamos')
      .select(
        `
        id,
        libro_isbn,
        persona,
        fecha_prestamo,
        fecha_limite,
        devuelto,
        fecha_devolucion,
        renewal_count,
        libros (titulo, autores, thumbnail),
        book_ratings (rating, comentario)
      `
      )
      .eq('persona', borrower)
      .order('fecha_prestamo', { ascending: false })

    if (error) {
      console.error('[loans-history] Database error:', error)
      return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })
    }

    return NextResponse.json(prestamos)
  } catch (error) {
    console.error('[loans-history] Error:', error)
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })
  }
}
