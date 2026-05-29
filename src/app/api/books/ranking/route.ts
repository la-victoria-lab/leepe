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

  // Obtener datos de los libros
  const isbns = ratingStats.map(r => r.isbn)
  const { data: libros, error: librosError } = await auth.supabase
    .from('libros')
    .select('isbn, titulo, autores, thumbnail')
    .in('isbn', isbns)

  if (librosError) {
    console.error('Error fetching libros:', librosError)
    return NextResponse.json(
      { error: librosError.message },
      { status: 500 }
    )
  }

  // Combinar datos
  const librosMap = new Map(libros.map(l => [l.isbn, l]))
  const ranking = ratingStats.map(r => ({
    isbn: r.isbn,
    promedio_rating: r.promedio_rating,
    total_ratings: r.total_ratings,
    libro: librosMap.get(r.isbn),
  }))

  // Formatear respuesta
  const formattedRanking = ranking.map((item) => ({
    isbn: item.isbn,
    titulo: item.libro?.titulo || 'Sin título',
    autores: item.libro?.autores || null,
    thumbnail: item.libro?.thumbnail || null,
    promedioRating: parseFloat(String(item.promedio_rating)) || 0,
    totalRatings: item.total_ratings || 0,
  }))

  return NextResponse.json(formattedRanking)
}
