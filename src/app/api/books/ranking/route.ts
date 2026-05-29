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

  // Obtener ranking de libros con sus estadísticas de rating
  const { data: ranking, error } = await auth.supabase
    .from('libro_rating_stats')
    .select(`
      isbn,
      promedio_rating,
      total_ratings,
      libros(titulo, autores, thumbnail)
    `)
    .gt('total_ratings', 0) // Solo libros que tienen al menos una calificación
    .order('promedio_rating', { ascending: false })
    .order('total_ratings', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching ranking:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  // Formatear respuesta
  const formattedRanking = ranking.map((item: any) => ({
    isbn: item.isbn,
    titulo: item.libros?.titulo || 'Sin título',
    autores: item.libros?.autores || null,
    thumbnail: item.libros?.thumbnail || null,
    promedioRating: parseFloat(item.promedio_rating) || 0,
    totalRatings: item.total_ratings || 0,
  }))

  return NextResponse.json(formattedRanking)
}
