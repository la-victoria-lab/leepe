import { NextRequest, NextResponse } from 'next/server'
import { requireCompanyUser } from '@/lib/api-auth'

/**
 * POST /api/rate-book
 * Guarda la calificación de un libro después de devolverlo
 *
 * Body:
 * - prestamoId: UUID del préstamo
 * - rating: 1-5 estrellas
 * - comentario: (opcional) comentario del usuario
 */
export async function POST(request: NextRequest) {
  const auth = await requireCompanyUser()
  if (!auth.ok) return auth.response

  const { prestamoId, rating, comentario } = await request.json() as {
    prestamoId: string
    rating: number
    comentario?: string
  }

  // Validar rating
  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return NextResponse.json(
      { error: 'Rating debe ser un número entre 1 y 5' },
      { status: 400 }
    )
  }

  // Validar que el préstamo existe y pertenece al usuario
  const { data: prestamo, error: prestamoError } = await auth.supabase
    .from('prestamos')
    .select('id, persona, libro_isbn, devuelto')
    .eq('id', prestamoId)
    .single()

  if (prestamoError || !prestamo) {
    return NextResponse.json(
      { error: 'Préstamo no encontrado' },
      { status: 404 }
    )
  }

  // Verificar que el préstamo ya fue devuelto
  if (!prestamo.devuelto) {
    return NextResponse.json(
      { error: 'Solo puedes calificar libros que ya has devuelto' },
      { status: 400 }
    )
  }

  // Insertar el rating
  const { data, error: ratingError } = await auth.supabase
    .from('book_ratings')
    .insert({
      prestamo_id: prestamoId,
      usuario_id: auth.user.id,
      rating,
      comentario: comentario?.trim() || null,
    })
    .select()
    .single()

  if (ratingError) {
    console.error('Error saving rating:', ratingError)
    return NextResponse.json(
      { error: ratingError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    rating: data,
    message: '¡Gracias por tu calificación!',
  })
}
