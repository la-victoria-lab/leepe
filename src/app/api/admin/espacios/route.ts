import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import type { PostgrestError } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const withCount = searchParams.get('with_count') === 'true'

  const selectQuery = withCount ? '*, libros(count)' : '*'

  const { data, error } = await auth.supabase
    .from('espacios')
    .select(selectQuery)
    .order('nombre', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = withCount
    ? data?.map((e: Record<string, unknown>) => ({
        ...e,
        libros_count: (e.libros as Array<{ count: number }>)?.[0]?.count ?? 0,
        libros: undefined,
      }))
    : data

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const body = await request.json()
  const { nombre, descripcion } = body

  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('espacios')
    .insert({ nombre: nombre.trim(), descripcion: descripcion?.trim() || null })
    .select()
    .single()

  if (error) {
    if ((error as PostgrestError).code === '23505') {
      return NextResponse.json({ error: 'Ya existe un espacio con ese nombre' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const body = await request.json()
  const { id, nombre, descripcion } = body

  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })

  const { data, error } = await auth.supabase
    .from('espacios')
    .update({ nombre: nombre.trim(), descripcion: descripcion?.trim() || null })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if ((error as PostgrestError).code === '23505') {
      return NextResponse.json({ error: 'Ya existe un espacio con ese nombre' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const { error } = await auth.supabase.from('espacios').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
