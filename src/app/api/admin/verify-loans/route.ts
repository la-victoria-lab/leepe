import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

/**
 * GET /api/admin/verify-loans
 * Obtiene todos los loans con status "Devuelto" pendientes de verificación física
 */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const { data: loans, error } = await auth.supabase
      .from('prestamos')
      .select(
        `
        id,
        persona,
        libro_isbn,
        fecha_prestamo,
        fecha_limite,
        devuelto,
        libros (
          titulo,
          autores,
          thumbnail
        ),
        book_ratings (
          rating,
          comentario
        )
      `
      )
      .eq('devuelto', true)
      .order('fecha_devuelto', { ascending: false })

    if (error) {
      console.error('[admin/verify-loans] Error:', error)
      return NextResponse.json(
        { error: 'Error al obtener préstamos' },
        { status: 500 }
      )
    }

    // Transformar respuesta para enviar al frontend
    interface LibroData {
      titulo: string
      autores: string[] | null
      thumbnail: string | null
    }

    interface RatingData {
      rating: number
      comentario: string | null
    }

    interface LoanData {
      id: string
      persona: string
      libro_isbn: string
      fecha_prestamo: string
      fecha_limite: string
      devuelto: string
      libros: LibroData[] | LibroData | null
      book_ratings: RatingData[] | null
    }

    const formattedLoans = (loans || []).map((loan: unknown) => {
      const loanData = loan as LoanData
      const libros = Array.isArray(loanData.libros) ? loanData.libros[0] : loanData.libros
      const libro = libros as LibroData | null
      const rating = Array.isArray(loanData.book_ratings) && loanData.book_ratings.length > 0
        ? (loanData.book_ratings[0] as RatingData)
        : null

      const autoresStr = Array.isArray(libro?.autores)
        ? libro.autores.join(', ')
        : typeof libro?.autores === 'string'
          ? libro.autores
          : null

      return {
        id: loanData.id,
        persona: loanData.persona,
        libro_titulo: libro?.titulo || 'Título desconocido',
        libro_autores: autoresStr,
        libro_thumbnail: libro?.thumbnail || null,
        fecha_prestamo: loanData.fecha_prestamo,
        fecha_limite: loanData.fecha_limite,
        fecha_devuelto: loanData.devuelto,
        rating: rating?.rating || null,
        comentario: rating?.comentario || null,
        status: 'Devuelto',
      }
    })

    return NextResponse.json({
      loans: formattedLoans,
      total: formattedLoans.length,
    })
  } catch (error) {
    console.error('[admin/verify-loans GET] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
