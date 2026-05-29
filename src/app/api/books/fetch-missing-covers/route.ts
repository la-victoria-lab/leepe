import { NextRequest, NextResponse } from 'next/server'
import { requireCompanyUser } from '@/lib/api-auth'
import { apiLogger } from '@/lib/logger'

interface OpenLibraryResponse {
  [key: string]: {
    cover_id?: number
    title?: string
    authors?: Array<{ name: string }>
  }
}

/**
 * Endpoint para actualizar portadas faltantes desde Open Library
 * GET/POST /api/books/fetch-missing-covers
 *
 * Busca libros sin portada y trata de obtenerlas desde Open Library
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación (solo admins)
    const auth = await requireCompanyUser()
    if (!auth.ok) return auth.response

    // Verificar que el usuario sea admin (por email)
    const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
    if (!auth.user.email || !ADMIN_EMAILS.includes(auth.user.email)) {
      return NextResponse.json({ error: 'Solo admins pueden ejecutar esta operación' }, { status: 403 })
    }

    apiLogger.info({}, 'Starting fetch-missing-covers task')

    // 1. Obtener todos los libros sin portada
    const { data: libros, error: fetchError } = await auth.supabase
      .from('libros')
      .select('isbn, titulo')
      .is('thumbnail', null)
      .order('titulo', { ascending: true })

    if (fetchError) {
      apiLogger.error({ err: fetchError }, 'Error fetching books without covers')
      return NextResponse.json(
        { error: 'Error al obtener libros', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!libros || libros.length === 0) {
      return NextResponse.json({
        message: 'No hay libros sin portada',
        processed: 0,
        found: 0,
        notFound: 0,
      })
    }

    apiLogger.info({ total: libros.length }, 'Found books without covers')

    let found = 0
    let notFound = 0
    const updates: Array<{ isbn: string; thumbnail: string }> = []

    // 2. Para cada libro, buscar portada en Open Library
    for (const libro of libros) {
      try {
        const response = await fetch(
          `https://openlibrary.org/api/books?bibkeys=ISBN:${libro.isbn}&format=json&jscmd=data`
        )

        if (!response.ok) {
          notFound++
          continue
        }

        const data: OpenLibraryResponse = await response.json()
        const bookKey = `ISBN:${libro.isbn}`

        if (data[bookKey] && data[bookKey].cover_id) {
          const coverId = data[bookKey].cover_id
          // Usar tamaño Medium (300px)
          const thumbnailUrl = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`

          updates.push({
            isbn: libro.isbn,
            thumbnail: thumbnailUrl,
          })

          found++
          apiLogger.info({ isbn: libro.isbn, coverUrl: thumbnailUrl }, 'Found cover in Open Library')
        } else {
          notFound++
        }
      } catch (error) {
        apiLogger.warn({ isbn: libro.isbn, err: error }, 'Error fetching from Open Library')
        notFound++
      }

      // Rate limiting: esperar 100ms entre requests
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // 3. Actualizar base de datos con las portadas encontradas
    let updateCount = 0
    for (const update of updates) {
      const { error: updateError } = await auth.supabase
        .from('libros')
        .update({ thumbnail: update.thumbnail })
        .eq('isbn', update.isbn)

      if (!updateError) {
        updateCount++
      } else {
        apiLogger.warn({ isbn: update.isbn, err: updateError }, 'Error updating thumbnail in DB')
      }
    }

    apiLogger.info(
      { processed: libros.length, found: updateCount, notFound: notFound },
      'fetch-missing-covers completed'
    )

    return NextResponse.json({
      message: 'Operación completada',
      processed: libros.length,
      found: updateCount,
      notFound: notFound,
    })
  } catch (error) {
    apiLogger.error({ err: error }, 'Error in fetch-missing-covers')
    return NextResponse.json({ error: 'Error al procesar portadas' }, { status: 500 })
  }
}

/**
 * GET también soportado para flexibilidad
 */
export async function GET(request: NextRequest) {
  return POST(request)
}
