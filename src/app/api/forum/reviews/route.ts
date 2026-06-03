import { NextRequest, NextResponse } from 'next/server'
import { requireCompanyUser } from '@/lib/api-auth'

interface ReviewResponse {
  id: string
  rating: number
  comentario: string | null
  usuario: string
  libro: {
    titulo: string
    isbn: string
  }
  likeCount: number
  loveCount: number
  userReaction: 'like' | 'love' | null
  fecha_creacion: string
}

/**
 * GET /api/forum/reviews?page=1&limit=20
 *
 * Retorna calificaciones de libros con:
 * - Información del usuario que calificó
 * - Información del libro
 * - Conteos de reacciones (likes, loves)
 * - Reacción del usuario actual (si existe)
 * - Paginación
 *
 * Query params:
 * - page: número de página (default: 1)
 * - limit: items por página (default: 20, máx: 100)
 */
export async function GET(request: NextRequest) {
  const auth = await requireCompanyUser()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)

    // Parse paginación
    let page = parseInt(searchParams.get('page') || '1', 10)
    let limit = parseInt(searchParams.get('limit') || '20', 10)

    // Validar paginación
    if (isNaN(page) || page < 1) page = 1
    if (isNaN(limit) || limit < 1) limit = 20
    if (limit > 100) limit = 100

    const offset = (page - 1) * limit

    // Query principal: obtener ratings con info de libros y usuarios
    const { data: ratings, error: ratingsError, count: totalCount } = await auth.supabase
      .from('book_ratings')
      .select(
        `
        id,
        rating,
        comentario,
        fecha_creacion,
        usuario_id,
        prestamo_id,
        prestamos (
          persona,
          libro_isbn,
          libros (
            titulo,
            isbn
          )
        )
      `,
        { count: 'exact' }
      )
      .not('comentario', 'is', null) // Solo ratings con comentarios
      .order('fecha_creacion', { ascending: false })
      .range(offset, offset + limit - 1)

    if (ratingsError) {
      console.error('[forum/reviews] Error fetching ratings:', ratingsError)
      return NextResponse.json(
        { error: 'Error al obtener calificaciones' },
        { status: 500 }
      )
    }

    if (!ratings || ratings.length === 0) {
      return NextResponse.json({
        reviews: [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          pages: Math.ceil((totalCount || 0) / limit),
        },
      })
    }

    // Obtener IDs de ratings para queries posteriores
    const ratingIds = ratings.map(r => r.id)

    // Query 2: Obtener todas las reacciones a estos ratings
    const { data: allReactions, error: reactionsError } = await auth.supabase
      .from('book_rating_reactions')
      .select('book_rating_id, tipo, usuario_id')
      .in('book_rating_id', ratingIds)

    if (reactionsError) {
      console.error('[forum/reviews] Error fetching reactions:', reactionsError)
      return NextResponse.json(
        { error: 'Error al obtener reacciones' },
        { status: 500 }
      )
    }

    // Mapear reacciones por rating ID para acceso rápido
    const reactionsByRating = (allReactions || []).reduce((acc, reaction) => {
      if (!acc[reaction.book_rating_id]) {
        acc[reaction.book_rating_id] = { likes: 0, loves: 0, userReaction: null }
      }
      if (reaction.tipo === 'like') {
        acc[reaction.book_rating_id].likes++
      } else if (reaction.tipo === 'love') {
        acc[reaction.book_rating_id].loves++
      }

      // Si la reacción es del usuario actual, marcarla
      if (reaction.usuario_id === auth.user.id) {
        acc[reaction.book_rating_id].userReaction = reaction.tipo
      }

      return acc
    }, {} as Record<string, { likes: number; loves: number; userReaction: 'like' | 'love' | null }>)

    // Construir respuesta
    interface PrestamoData {
      persona: string
      libro_isbn: string
      libros?: {
        titulo: string
        isbn: string
      }
    }

    const reviews: ReviewResponse[] = ratings.map(rating => {
      const prestamo = (rating.prestamos as unknown as PrestamoData | null)
      const libro = prestamo?.libros
      const reactions = reactionsByRating[rating.id] || { likes: 0, loves: 0, userReaction: null }
      // Usar la persona del préstamo (email/nombre del prestamista)
      const userName = prestamo?.persona || 'Usuario'

      return {
        id: rating.id,
        rating: rating.rating,
        comentario: rating.comentario,
        usuario: userName,
        libro: {
          titulo: libro?.titulo || 'Título desconocido',
          isbn: libro?.isbn || prestamo?.libro_isbn || '',
        },
        likeCount: reactions.likes,
        loveCount: reactions.loves,
        userReaction: reactions.userReaction,
        fecha_creacion: rating.fecha_creacion,
      }
    })

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit),
      },
    })
  } catch (error) {
    console.error('[forum/reviews GET] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
