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
      return NextResponse.json({ error: 'No se encontró código ISBN en la imagen' }, { status: 404 })
    }

    // Validar formato de ISBN
    const validation = validateOrError(IsbnSchema, isbn)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Find active loan for this book and person
    const { data: prestamo, error: prestamoError } = await auth.supabase
      .from('prestamos')
      .select('*')
      .eq('libro_isbn', isbn)
      .eq('persona', borrower)
      .eq('devuelto', false)
      .single()

    if (prestamoError || !prestamo) {
      return NextResponse.json(
        { error: `No se encontró préstamo activo de ${borrower} para este libro` },
        { status: 404 }
      )
    }

    // Update loan as returned
    const { error: updateError } = await auth.supabase
      .from('prestamos')
      .update({
        devuelto: true,
        fecha_devolucion: new Date().toISOString(),
      })
      .eq('id', prestamo.id)

    if (updateError) {
      apiLogger.error({ err: updateError, loanId: prestamo.id }, 'Database error updating loan')
      return NextResponse.json({ error: 'Error al registrar la devolución' }, { status: 500 })
    }

    apiLogger.info({ isbn, borrower, loanId: prestamo.id }, 'Book returned successfully')

    // Get book info
    const { data: libro } = await auth.supabase.from('libros').select('*').eq('isbn', isbn).single()

    return NextResponse.json({
      message: 'Libro devuelto exitosamente',
      prestamo,
      libro,
    })
  } catch (error) {
    apiLogger.error({ err: error }, 'Error returning book')
    return NextResponse.json({ error: 'Error al devolver el libro' }, { status: 500 })
  }
}
