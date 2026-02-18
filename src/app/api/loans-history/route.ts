import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { data: prestamos, error } = await auth.supabase
      .from('prestamos')
      .select(
        `
        *,
        libros (titulo, autores, thumbnail)
      `
      )
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
