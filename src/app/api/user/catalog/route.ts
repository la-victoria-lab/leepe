import { NextRequest, NextResponse } from 'next/server'
import { requireCompanyUser } from '@/lib/api-auth'
import { categorizarLibro, GENEROS_DISPONIBLES, IDIOMAS_DISPONIBLES } from '@/lib/book-categorizer'

interface LibroEstado {
  isbn: string
  titulo: string
  autores: string[] | null
  thumbnail: string | null
  copias_total: number
  copias_disponibles: number
  disponible: boolean
  descripcion: string | null
}

interface LibroConCategoria extends LibroEstado {
  generos?: string[]
  idioma?: string
}

export async function GET(request: NextRequest) {
  const auth = await requireCompanyUser()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('q') || ''
  const genre = searchParams.get('genre') || ''
  const language = searchParams.get('language') || ''
  const availability = searchParams.get('availability') || 'all' // 'all', 'available', 'unavailable'
  const sort = searchParams.get('sort') || 'titulo' // 'titulo', 'rating', 'recent'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  // 1. Obtener todos los libros con descripción para categorización
  let query = auth.supabase
    .from('libros_estado')
    .select('isbn, titulo, autores, thumbnail, copias_total, copias_disponibles, disponible, descripcion', { count: 'exact' })

  // 2. Aplicar búsqueda de texto
  if (search.trim()) {
    query = query.or(`titulo.ilike.%${search}%,autores.ilike.%${search}%`)
  }

  // 3. Aplicar filtro de disponibilidad
  if (availability === 'available') {
    query = query.eq('disponible', true)
  } else if (availability === 'unavailable') {
    query = query.eq('disponible', false)
  }

  // 4. Ejecutar query inicial
  const { data: allBooks, count, error } = await query

  if (error) {
    console.error('[user/catalog] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!allBooks) {
    return NextResponse.json(
      {
        books: [],
        filters: {
          genres: GENEROS_DISPONIBLES,
          languages: IDIOMAS_DISPONIBLES,
          authors: [],
        },
        pagination: { page, limit, total: 0, totalPages: 0 },
      },
      { status: 200 }
    )
  }

  // 5. Categorizar libros (agregar generos e idioma)
  const categorizedBooks: LibroConCategoria[] = (allBooks as LibroEstado[]).map((libro: LibroEstado) => {
    const generos = categorizarLibro(libro.titulo, libro.autores, libro.descripcion)
    // Simplificado: inferir idioma basado en patrones
    const idioma =
      /english|the|and|business/.test(`${libro.titulo} ${libro.autores}`.toLowerCase()) === true
        ? 'Inglés'
        : 'Español'

    return {
      ...libro,
      generos,
      idioma,
    }
  })

  // 6. Filtrar por género e idioma (después de categorizar)
  let filteredBooks = categorizedBooks
  if (genre) {
    filteredBooks = filteredBooks.filter((libro) => libro.generos?.includes(genre))
  }
  if (language) {
    filteredBooks = filteredBooks.filter((libro) => libro.idioma === language)
  }

  // 7. Ordenamiento
  let sortedBooks = [...filteredBooks]
  switch (sort) {
    case 'rating':
      // Usar rating si estuviera disponible (placeholder)
      break
    case 'recent':
      // Usar fecha creación si estuviera disponible (placeholder)
      sortedBooks = sortedBooks.reverse()
      break
    case 'titulo':
    default:
      sortedBooks = sortedBooks.sort((a, b) => a.titulo.localeCompare(b.titulo))
  }

  // 8. Paginación
  const paginatedBooks = sortedBooks.slice(offset, offset + limit)

  // 9. Extraer opciones de filtros disponibles
  const uniqueGenres = Array.from(
    new Set(categorizedBooks.flatMap((libro) => libro.generos || []))
  ).sort()
  const uniqueLanguages = Array.from(new Set(categorizedBooks.map((libro) => libro.idioma))).sort()
  const uniqueAuthors = Array.from(
    new Set(categorizedBooks.flatMap((libro) => (Array.isArray(libro.autores) ? libro.autores : [])))
  ).sort()

  // 10. Respuesta completa con filtros
  return NextResponse.json({
    books: paginatedBooks.map((libro) => ({
      isbn: libro.isbn,
      titulo: libro.titulo,
      autores: libro.autores,
      thumbnail: libro.thumbnail,
      copias_total: libro.copias_total,
      copias_disponibles: libro.copias_disponibles,
      disponible: libro.disponible,
      generos: libro.generos,
      idioma: libro.idioma,
    })),
    filters: {
      genres: uniqueGenres,
      languages: uniqueLanguages,
      authors: uniqueAuthors.slice(0, 20), // Limitar a 20 autores por performance
    },
    pagination: {
      page,
      limit,
      total: filteredBooks.length,
      totalPages: Math.ceil(filteredBooks.length / limit),
    },
  })
}
