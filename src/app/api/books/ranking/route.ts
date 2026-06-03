import { NextRequest, NextResponse } from 'next/server'
import { requireCompanyUser } from '@/lib/api-auth'

/**
 * GET /api/books/ranking
 * Obtiene el ranking de libros mejor puntuados
 *
 * Query params:
 * - limit: cantidad de libros a retornar (default: 10)
 */
export async function GET(request: NextRequest) {
  const auth = await requireCompanyUser()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  // Obtener ranking de libros con sus estadísticas de rating + info del libro
  const { data: ratingStats, error: ratingError } = await auth.supabase
    .from('libro_rating_stats')
    .select('isbn, promedio_rating, total_ratings')
    .gt('total_ratings', 0)
    .order('promedio_rating', { ascending: false })
    .order('total_ratings', { ascending: false })
    .limit(limit)

  if (ratingError) {
    console.error('Error fetching rating stats:', ratingError)
    return NextResponse.json(
      { error: ratingError.message },
      { status: 500 }
    )
  }

  // Obtener datos de los libros y sus comentarios
  const isbns = ratingStats.map(r => r.isbn)
  const { data: libros, error: librosError } = await auth.supabase
    .from('libros')
    .select('isbn, titulo, autores, thumbnail')
    .in('isbn', isbns)

  // Obtener comentarios de los ratings con info del prestamo
  const { data: allRatings } = await auth.supabase
    .from('book_ratings')
    .select('id, prestamo_id, rating, comentario, prestamos(libro_isbn, persona)')
    .order('created_at', { ascending: false })

  if (librosError) {
    console.error('Error fetching libros:', librosError)
    return NextResponse.json(
      { error: librosError.message },
      { status: 500 }
    )
  }

  // Obtener todas las reacciones para estos ratings
  const ratingIds = allRatings?.map(r => r.id) || []
  const { data: allReactions } = await auth.supabase
    .from('book_rating_reactions')
    .select('book_rating_id, tipo, usuario_id')
    .in('book_rating_id', ratingIds)

  // Combinar datos
  const librosMap = new Map(libros.map(l => [l.isbn, l]))

  // Mapear reacciones por rating ID
  const reactionsByRating = (allReactions || []).reduce((acc, reaction) => {
    if (!acc[reaction.book_rating_id]) {
      acc[reaction.book_rating_id] = { likes: 0, loves: 0, userReaction: null as 'like' | 'love' | null }
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

  // Agrupar ratings por ISBN
  interface PrestamoInfo {
    libro_isbn: string
    persona: string
  }

  const ratingsByIsbn = new Map<string, Array<{
    id: string
    rating: number
    comentario: string | null
    usuario: string
    likeCount?: number
    loveCount?: number
    userReaction?: 'like' | 'love' | null
  }>>()

  if (allRatings && Array.isArray(allRatings)) {
    for (const rating of allRatings) {
      const prestamos = Array.isArray(rating.prestamos) ? rating.prestamos[0] : rating.prestamos
      const prestamoInfo = prestamos as PrestamoInfo | undefined
      const isbn = prestamoInfo?.libro_isbn
      const usuario = prestamoInfo?.persona || 'Usuario'
      const reactions = reactionsByRating[rating.id] || { likes: 0, loves: 0, userReaction: null }

      if (isbn) {
        if (!ratingsByIsbn.has(isbn)) {
          ratingsByIsbn.set(isbn, [])
        }
        ratingsByIsbn.get(isbn)!.push({
          id: rating.id,
          rating: rating.rating,
          comentario: rating.comentario,
          usuario,
          likeCount: reactions.likes,
          loveCount: reactions.loves,
          userReaction: reactions.userReaction,
        })
      }
    }
  }

  const ranking = ratingStats.map(r => ({
    isbn: r.isbn,
    promedio_rating: r.promedio_rating,
    total_ratings: r.total_ratings,
    libro: librosMap.get(r.isbn),
    comentarios: ratingsByIsbn.get(r.isbn) || [],
  }))

  // Formatear respuesta
  const formattedRanking = ranking.map((item) => ({
    isbn: item.isbn,
    titulo: item.libro?.titulo || 'Sin título',
    autores: item.libro?.autores || null,
    thumbnail: item.libro?.thumbnail || null,
    promedioRating: parseFloat(String(item.promedio_rating)) || 0,
    totalRatings: item.total_ratings || 0,
    comentarios: item.comentarios,
  }))

  return NextResponse.json(formattedRanking)
}
