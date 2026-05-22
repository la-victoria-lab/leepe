import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { isbn, espacio_id } = await request.json() as { isbn: string; espacio_id?: string | null }

  const cleanIsbn = isbn?.trim().replace(/[-\s]/g, '')
  if (!cleanIsbn || !/^\d{10}(\d{3})?$/.test(cleanIsbn)) {
    return NextResponse.json({ error: 'ISBN inválido (debe tener 10 o 13 dígitos)' }, { status: 400 })
  }

  // Verificar duplicado
  const { data: existing } = await auth.supabase
    .from('libros')
    .select('isbn, titulo')
    .eq('isbn', cleanIsbn)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      registered: [],
      duplicates: [{ isbn: existing.isbn, titulo: existing.titulo }],
      notFound: [],
      errors: [],
    })
  }

  // Buscar en Google Books
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}${apiKey ? `&key=${apiKey}` : ''}`
    const res = await fetch(url)
    const data = await res.json()

    if (!data.items?.length) {
      return NextResponse.json({ error: `No se encontró el libro con ISBN ${cleanIsbn} en Google Books` }, { status: 404 })
    }

    const book = data.items[0].volumeInfo
    const bookData = {
      isbn: cleanIsbn,
      titulo: book.title || 'Sin título',
      autores: book.authors || null,
      descripcion: book.description || null,
      thumbnail: book.imageLinks?.thumbnail || null,
      espacio_id: espacio_id || null,
    }

    const { error: insertError } = await auth.supabase.from('libros').insert(bookData)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      registered: [{ isbn: cleanIsbn, titulo: bookData.titulo }],
      duplicates: [],
      notFound: [],
      errors: [],
    })
  } catch {
    return NextResponse.json({ error: 'Error consultando Google Books' }, { status: 500 })
  }
}
