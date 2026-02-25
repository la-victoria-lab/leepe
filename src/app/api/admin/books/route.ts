import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = auth.supabase
    .from('libros')
    .select('*', { count: 'exact' })
    .order('titulo', { ascending: true })
    .range(from, to)

  if (search) {
    query = query.or(`titulo.ilike.%${search}%,autores.ilike.%${search}%,isbn.eq.${search}`)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    meta: {
      total: count,
      page,
      last_page: Math.ceil((count || 0) / limit),
    },
  })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const { isbn, titulo, autores, descripcion, thumbnail, image_path } = body

    if (!isbn || !titulo) {
      return NextResponse.json({ error: 'ISBN y Título son obligatorios' }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('libros')
      .insert({ isbn, titulo, autores, descripcion, thumbnail, image_path })
      .select()
      .single()

    if (error) {
      if ((error as any).code === '23505') {
        return NextResponse.json({ error: 'Este ISBN ya está registrado' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Error al crear libro' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const { isbn, ...updates } = body

    if (!isbn) {
      return NextResponse.json({ error: 'ISBN es requerido para actualizar' }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('libros')
      .update(updates)
      .eq('isbn', isbn)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Error al actualizar libro' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const isbn = searchParams.get('isbn')

  if (!isbn) {
    return NextResponse.json({ error: 'ISBN es requerido para eliminar' }, { status: 400 })
  }

  const { error } = await auth.supabase.from('libros').delete().eq('isbn', isbn)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
