import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
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
  try {
    const body = await request.json()
    const { isbn, titulo, autores, descripcion, thumbnail, image_path } = body

    // Validar campos obligatorios
    if (!isbn || !titulo) {
      return NextResponse.json({ error: 'ISBN y Título son obligatorios' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('libros')
      .insert({
        isbn,
        titulo,
        autores, // Debe ser array
        descripcion,
        thumbnail,
        image_path,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json({ error: 'Este ISBN ya está registrado' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al crear libro' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { isbn, ...updates } = body // ISBN es la clave primaria

    if (!isbn) {
      return NextResponse.json({ error: 'ISBN es requerido para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase.from('libros').update(updates).eq('isbn', isbn).select().single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al actualizar libro' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const isbn = searchParams.get('isbn')

  if (!isbn) {
    return NextResponse.json({ error: 'ISBN es requerido para eliminar' }, { status: 400 })
  }

  const { error } = await supabase.from('libros').delete().eq('isbn', isbn)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
