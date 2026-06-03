import { NextRequest, NextResponse } from 'next/server'
import { requireCompanyUser } from '@/lib/api-auth'

/**
 * POST /api/rate-book/react
 * Reaccionar a una calificación de libro (like o love)
 *
 * Body:
 * - bookRatingId: UUID de la calificación
 * - tipo: 'like' | 'love'
 *
 * Lógica:
 * - Si existe reacción del usuario con MISMO tipo → DELETE
 * - Si existe reacción del usuario con DISTINTO tipo → UPDATE tipo
 * - Si no existe → INSERT
 */
export async function POST(request: NextRequest) {
  const auth = await requireCompanyUser()
  if (!auth.ok) return auth.response

  try {
    const { bookRatingId, tipo } = await request.json() as {
      bookRatingId: string
      tipo: string
    }

    // Validar inputs
    if (!bookRatingId || typeof bookRatingId !== 'string') {
      return NextResponse.json(
        { error: 'bookRatingId es requerido y debe ser un string' },
        { status: 400 }
      )
    }

    if (!tipo || (tipo !== 'like' && tipo !== 'love')) {
      return NextResponse.json(
        { error: 'tipo debe ser "like" o "love"' },
        { status: 400 }
      )
    }

    // Validar que la calificación existe
    const { data: rating, error: ratingError } = await auth.supabase
      .from('book_ratings')
      .select('id')
      .eq('id', bookRatingId)
      .single()

    if (ratingError || !rating) {
      return NextResponse.json(
        { error: 'Calificación no encontrada' },
        { status: 404 }
      )
    }

    // Buscar reacción existente del usuario para este rating
    const { data: existingReaction, error: queryError } = await auth.supabase
      .from('book_rating_reactions')
      .select('id, tipo')
      .eq('book_rating_id', bookRatingId)
      .eq('usuario_id', auth.user.id)
      .single()

    if (queryError && queryError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error querying reactions:', queryError)
      return NextResponse.json(
        { error: 'Error al verificar reacciones existentes' },
        { status: 500 }
      )
    }

    // Caso 1: Existe reacción con MISMO tipo → DELETE (toggle off)
    if (existingReaction && existingReaction.tipo === tipo) {
      const { error: deleteError } = await auth.supabase
        .from('book_rating_reactions')
        .delete()
        .eq('id', existingReaction.id)

      if (deleteError) {
        console.error('Error deleting reaction:', deleteError)
        return NextResponse.json(
          { error: 'Error al eliminar reacción' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'deleted',
        message: 'Reacción eliminada',
      })
    }

    // Caso 2: Existe reacción con DISTINTO tipo → UPDATE
    if (existingReaction && existingReaction.tipo !== tipo) {
      const { error: updateError } = await auth.supabase
        .from('book_rating_reactions')
        .update({ tipo })
        .eq('id', existingReaction.id)

      if (updateError) {
        console.error('Error updating reaction:', updateError)
        return NextResponse.json(
          { error: 'Error al actualizar reacción' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        message: 'Reacción actualizada',
      })
    }

    // Caso 3: No existe reacción → INSERT
    const { data: newReaction, error: insertError } = await auth.supabase
      .from('book_rating_reactions')
      .insert({
        book_rating_id: bookRatingId,
        usuario_id: auth.user.id,
        tipo,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting reaction:', insertError)
      return NextResponse.json(
        { error: 'Error al crear reacción' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      action: 'created',
      reaction: newReaction,
      message: 'Reacción agregada',
    })
  } catch (error) {
    console.error('[rate-book/react POST] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/rate-book/react?bookRatingId=<UUID>
 * Eliminar una reacción de un rating
 *
 * Query params:
 * - bookRatingId: UUID de la calificación
 *
 * Validaciones:
 * - Valida que la reacción le pertenece al usuario autenticado
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireCompanyUser()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const bookRatingId = searchParams.get('bookRatingId')

    if (!bookRatingId) {
      return NextResponse.json(
        { error: 'bookRatingId es requerido como query param' },
        { status: 400 }
      )
    }

    // Buscar la reacción del usuario para validar que le pertenece
    const { data: reaction, error: queryError } = await auth.supabase
      .from('book_rating_reactions')
      .select('id, usuario_id')
      .eq('book_rating_id', bookRatingId)
      .eq('usuario_id', auth.user.id)
      .single()

    if (queryError || !reaction) {
      return NextResponse.json(
        { error: 'Reacción no encontrada o no te pertenece' },
        { status: 404 }
      )
    }

    // Validar que pertenece al usuario (double-check por seguridad)
    if (reaction.usuario_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta reacción' },
        { status: 403 }
      )
    }

    // Eliminar reacción
    const { error: deleteError } = await auth.supabase
      .from('book_rating_reactions')
      .delete()
      .eq('id', reaction.id)

    if (deleteError) {
      console.error('Error deleting reaction:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar reacción' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Reacción eliminada',
    })
  } catch (error) {
    console.error('[rate-book/react DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
