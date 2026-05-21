import { NextRequest, NextResponse } from 'next/server'
import { requireCompanyUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await requireCompanyUser()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('q') || ''

  let query = auth.supabase
    .from('libros_estado')
    .select('isbn, titulo, autores, thumbnail, copias_total, copias_disponibles, disponible')
    .order('titulo', { ascending: true })
    .limit(50)

  if (search.trim()) {
    query = query.or(
      `titulo.ilike.%${search}%,autores.ilike.%${search}%`
    )
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
