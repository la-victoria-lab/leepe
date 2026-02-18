import { NextRequest, NextResponse } from 'next/server'

import { extractISBNFromImage } from '@/lib/isbn-extractor'
import { requireCompanyUser } from '@/lib/api-auth'
import { IsbnSchema, validateOrError } from '@/lib/validations'
import { apiLogger } from '@/lib/logger'

function getBorrowerLabel(email: string, fullName: string | undefined | null) {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedName = typeof fullName === 'string' ? fullName.trim() : ''
  return normalizedName || normalizedEmail
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCompanyUser()
    if (!auth.ok) return auth.response

    const contentType = request.headers.get('content-type') || ''
    const borrower = getBorrowerLabel(auth.user.email!, auth.user.user_metadata?.full_name)
    let isbn = ''

    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { isbn?: string }
      isbn = (body?.isbn || '').trim()
    } else {
      const formData = await request.formData()
      const image = formData.get('image') as File

      if (!image) {
        return NextResponse.json({ error: 'Se requiere isbn o imagen' }, { status: 400 })
      }

      isbn = await extractISBNFromImage(image)
    }

    if (!isbn) {
      return NextResponse.json({ error: 'Se requiere isbn o imagen' }, { status: 400 })
    }

    if (isbn === 'NOT_FOUND') {
      return NextResponse.json(
        { error: 'No se encontró código ISBN en la imagen', type: 'isbn_not_detected' },
        { status: 404 }
      )
    }

    // Validar formato de ISBN
    apiLogger.info(
      { rawIsbn: isbn, length: isbn.length, chars: [...isbn].map((c) => c.charCodeAt(0)) },
      'ISBN before validation'
    )
    const validation = validateOrError(IsbnSchema, isbn)
    if (!validation.success) {
      apiLogger.warn({ rawIsbn: isbn, error: validation.error }, 'ISBN validation failed')
      return NextResponse.json({ error: validation.error, type: 'invalid_isbn', rawIsbn: isbn }, { status: 400 })
    }

    // Check if book exists in inventory
    const { data: libro, error: libroError } = await auth.supabase.from('libros').select('*').eq('isbn', isbn).single()

    if (libroError || !libro) {
      return NextResponse.json(
        { error: 'Este libro no está registrado en el inventario', type: 'book_not_found', isbn },
        { status: 404 }
      )
    }

    // Check if book is already lent
    const { data: activePrestamo } = await auth.supabase
      .from('prestamos')
      .select('*')
      .eq('libro_isbn', isbn)
      .eq('devuelto', false)
      .single()

    if (activePrestamo) {
      return NextResponse.json(
        { error: `Este libro ya está prestado a ${activePrestamo.persona}`, type: 'already_lent' },
        { status: 400 }
      )
    }

    // Create loan record
    const { data: prestamo, error: prestamoError } = await auth.supabase
      .from('prestamos')
      .insert({
        libro_isbn: isbn,
        persona: borrower,
      })
      .select()
      .single()

    if (prestamoError) {
      apiLogger.error({ err: prestamoError, isbn, borrower }, 'Database error creating loan')
      return NextResponse.json({ error: 'Error al registrar el préstamo' }, { status: 500 })
    }

    apiLogger.info({ isbn, borrower, prestamoId: prestamo.id }, 'Book lent successfully')

    return NextResponse.json({
      message: 'Libro prestado exitosamente',
      prestamo,
      libro,
    })
  } catch (error) {
    apiLogger.error({ err: error }, 'Error lending book')
    return NextResponse.json({ error: 'Error al prestar el libro' }, { status: 500 })
  }
}
