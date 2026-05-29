import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

type BookData = {
  isbn: string
  titulo: string
  autores: string[] | null
  descripcion: string | null
  thumbnail: string | null
  espacio_id: string | null
}

/** Busca libro en Google Books */
async function fetchFromGoogleBooks(isbn: string): Promise<BookData | null> {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${apiKey ? `&key=${apiKey}` : ''}`
    const res = await fetch(url)
    const data = await res.json()
    if (!data.items?.length) return null
    const book = data.items[0].volumeInfo
    return {
      isbn,
      titulo: book.title || 'Sin título',
      autores: book.authors || null,
      descripcion: book.description || null,
      thumbnail: book.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
      espacio_id: null,
    }
  } catch {
    return null
  }
}

/** Busca libro en Open Library (fallback gratuito) */
async function fetchFromOpenLibrary(isbn: string): Promise<BookData | null> {
  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    const res = await fetch(url)
    const data = await res.json()
    const key = `ISBN:${isbn}`
    if (!data[key]) return null
    const book = data[key]
    const authors = book.authors?.map((a: { name: string }) => a.name) || null
    const thumbnail = book.cover?.medium || book.cover?.small || null
    return {
      isbn,
      titulo: book.title || 'Sin título',
      autores: authors,
      descripcion: book.excerpts?.[0]?.text || null,
      thumbnail,
      espacio_id: null,
    }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { isbn, espacio_id, titulo_manual, autores_manual } = await request.json() as {
    isbn?: string
    espacio_id?: string | null
    titulo_manual?: string
    autores_manual?: string
  }

  // Si viene ISBN, validar que sea válido (10 o 13 dígitos)
  // Si no viene ISBN, está permitido (para libros sin ISBN como informes)
  const cleanIsbn = isbn?.trim().replace(/[-\s]/g, '') || null
  if (cleanIsbn && !/^\d{10}(\d{3})?$/.test(cleanIsbn)) {
    return NextResponse.json({ error: 'ISBN inválido (debe tener 10 o 13 dígitos)' }, { status: 400 })
  }

  // Si no hay ISBN ni título manual, error
  if (!cleanIsbn && !titulo_manual?.trim()) {
    return NextResponse.json({ error: 'Debes proporcionar un ISBN o un título' }, { status: 400 })
  }

  // Verificar duplicado (solo si hay ISBN)
  if (cleanIsbn) {
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
  }

  // Si viene con título manual (el usuario lo escribió a mano), registrar directo
  if (titulo_manual?.trim()) {
    const bookData: BookData = {
      isbn: cleanIsbn || '',  // Si no hay ISBN, usar string vacío (la BD puede tener NOT NULL)
      titulo: titulo_manual.trim(),
      autores: autores_manual ? [autores_manual.trim()] : null,
      descripcion: null,
      thumbnail: null,
      espacio_id: espacio_id || null,
    }
    const { error: insertError } = await auth.supabase.from('libros').insert(bookData)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    return NextResponse.json({
      registered: [{ isbn: cleanIsbn || 'SIN-ISBN', titulo: bookData.titulo }],
      duplicates: [], notFound: [], errors: [],
    })
  }

  // 1. Intentar Google Books
  let bookData = await fetchFromGoogleBooks(cleanIsbn)

  // 2. Fallback: Open Library
  if (!bookData) {
    bookData = await fetchFromOpenLibrary(cleanIsbn)
  }

  // 3. Si ninguna API lo tiene, pedir que ingresen el título manualmente
  if (!bookData) {
    return NextResponse.json({
      error: 'not_found_in_apis',
      isbn: cleanIsbn,
      message: `No encontrado en Google Books ni Open Library. Ingresa el título manualmente.`,
    }, { status: 404 })
  }

  bookData.espacio_id = espacio_id || null

  const { error: insertError } = await auth.supabase.from('libros').insert(bookData)
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({
    registered: [{ isbn: cleanIsbn, titulo: bookData.titulo }],
    duplicates: [], notFound: [], errors: [],
  })
}
