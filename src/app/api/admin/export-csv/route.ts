import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { data: prestamos, error } = await auth.supabase
    .from('prestamos')
    .select(`
      id,
      persona,
      fecha_prestamo,
      fecha_limite,
      fecha_devolucion,
      devuelto,
      libros (isbn, titulo, autores)
    `)
    .order('fecha_prestamo', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Construir CSV
  const headers = ['ID', 'ISBN', 'Título', 'Autores', 'Persona', 'Fecha Préstamo', 'Fecha Límite', 'Fecha Devolución', 'Estado']
  const rows = (prestamos || []).map((p) => {
    const libro = p.libros as unknown as { isbn: string; titulo: string; autores: string[] | null } | null
    return [
      p.id,
      libro?.isbn ?? '',
      `"${(libro?.titulo ?? '').replace(/"/g, '""')}"`,
      `"${(libro?.autores ?? []).join(', ').replace(/"/g, '""')}"`,
      `"${(p.persona ?? '').replace(/"/g, '""')}"`,
      p.fecha_prestamo ? new Date(p.fecha_prestamo).toLocaleDateString('es-PE') : '',
      p.fecha_limite ? new Date(p.fecha_limite).toLocaleDateString('es-PE') : '',
      p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleDateString('es-PE') : '',
      p.devuelto ? 'Devuelto' : 'Activo',
    ].join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const fecha = new Date().toISOString().split('T')[0]

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="prestamos-${fecha}.csv"`,
    },
  })
}
