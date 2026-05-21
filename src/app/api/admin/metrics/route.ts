import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const ahora = new Date().toISOString()

  const [
    { count: prestamosActivos },
    { count: prestamosVencidos },
    { count: totalLibros },
    { data: topLibros },
    { data: usuariosActivos },
    { data: copiasData },
  ] = await Promise.all([
    // Préstamos activos
    auth.supabase
      .from('prestamos')
      .select('*', { count: 'exact', head: true })
      .eq('devuelto', false),

    // Préstamos vencidos (activos y con fecha_limite pasada)
    auth.supabase
      .from('prestamos')
      .select('*', { count: 'exact', head: true })
      .eq('devuelto', false)
      .lt('fecha_limite', ahora),

    // Total de libros
    auth.supabase
      .from('libros')
      .select('*', { count: 'exact', head: true }),

    // Top 5 libros más prestados
    auth.supabase
      .from('prestamos')
      .select('libro_isbn, libros(titulo, thumbnail)')
      .order('libro_isbn')
      .limit(200),

    // Usuarios con préstamos activos
    auth.supabase
      .from('prestamos')
      .select('persona')
      .eq('devuelto', false),

    // Copias disponibles
    auth.supabase
      .from('libros')
      .select('isbn, copias_total'),
  ])

  // Calcular top libros más prestados
  const conteo: Record<string, { count: number; titulo: string; thumbnail: string | null }> = {}
  for (const p of topLibros || []) {
    const isbn = p.libro_isbn
    if (!conteo[isbn]) {
      conteo[isbn] = {
        count: 0,
        titulo: (p.libros as unknown as { titulo: string; thumbnail: string | null } | null)?.titulo || isbn,
        thumbnail: (p.libros as unknown as { titulo: string; thumbnail: string | null } | null)?.thumbnail || null,
      }
    }
    conteo[isbn].count++
  }
  const masPrestaodos = Object.values(conteo)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Usuarios únicos activos
  const usuariosUnicos = new Set((usuariosActivos || []).map((p) => p.persona)).size

  // Total copias disponibles
  const totalCopias = (copiasData || []).reduce((acc, l) => acc + (l.copias_total ?? 1), 0)
  const copiasDisponibles = totalCopias - (prestamosActivos ?? 0)

  return NextResponse.json({
    prestamosActivos: prestamosActivos ?? 0,
    prestamosVencidos: prestamosVencidos ?? 0,
    copiasDisponibles: Math.max(0, copiasDisponibles),
    totalLibros: totalLibros ?? 0,
    usuariosActivos: usuariosUnicos,
    masPrestaodos,
  })
}
