import { NextRequest, NextResponse } from 'next/server'
import { requireCompanyUser } from '@/lib/api-auth'
import { apiLogger } from '@/lib/logger'
import { LOAN_CONFIG } from '@/lib/loan-config'
import * as emailService from '@/lib/email-service'

function getBorrowerLabel(email: string, fullName: string | undefined | null) {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedName = typeof fullName === 'string' ? fullName.trim() : ''
  return normalizedName || normalizedEmail
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCompanyUser()
    if (!auth.ok) return auth.response

    const { prestamoId } = await request.json() as { prestamoId: string }
    if (!prestamoId) {
      return NextResponse.json({ error: 'prestamoId requerido' }, { status: 400 })
    }

    const borrower = getBorrowerLabel(auth.user.email!, auth.user.user_metadata?.full_name)

    // Verificar que el préstamo pertenece al usuario y está activo
    const { data: prestamo, error: fetchError } = await auth.supabase
      .from('prestamos')
      .select('*')
      .eq('id', prestamoId)
      .eq('persona', borrower)
      .eq('devuelto', false)
      .single()

    if (fetchError || !prestamo) {
      return NextResponse.json(
        { error: 'Préstamo no encontrado o no autorizado' },
        { status: 404 }
      )
    }

    // Verificar límite de renovaciones
    const renewalCount = prestamo.renewal_count || 0
    if (renewalCount >= LOAN_CONFIG.MAX_RENEWALS) {
      return NextResponse.json(
        {
          error: `No se puede renovar más. Límite de renovaciones alcanzado (${renewalCount}/${LOAN_CONFIG.MAX_RENEWALS})`,
          type: 'max_renewals_exceeded',
        },
        { status: 400 }
      )
    }

    // Nueva fecha límite: agregar RENEWAL_DAYS desde hoy (o desde la fecha_limite actual si aún no venció)
    const hoy = new Date()
    const limiteActual = prestamo.fecha_limite ? new Date(prestamo.fecha_limite) : hoy
    const baseDate = limiteActual > hoy ? limiteActual : hoy

    const nuevaFecha = new Date(baseDate)
    nuevaFecha.setDate(nuevaFecha.getDate() + LOAN_CONFIG.RENEWAL_DAYS)

    const { error: updateError } = await auth.supabase
      .from('prestamos')
      .update({
        fecha_limite: nuevaFecha.toISOString(),
        renewal_count: renewalCount + 1,
      })
      .eq('id', prestamoId)

    if (updateError) {
      apiLogger.error({ err: updateError, prestamoId }, 'Error renovando préstamo')
      return NextResponse.json({ error: 'Error al renovar el préstamo' }, { status: 500 })
    }

    // Obtener información del libro para enviar email
    const { data: libro } = await auth.supabase
      .from('libros')
      .select('titulo, autores')
      .eq('isbn', prestamo.libro_isbn)
      .single()

    // Enviar email de confirmación de renovación
    if (libro) {
      await emailService.sendRenewalConfirmation({
        bookTitle: libro.titulo,
        borrowerName: borrower,
        borrowerEmail: auth.user.email!,
        newDueDate: nuevaFecha,
        renewalCount: renewalCount + 1,
        maxRenewals: LOAN_CONFIG.MAX_RENEWALS,
      })
    }

    apiLogger.info(
      { prestamoId, borrower, nuevaFecha, renewalCount: renewalCount + 1 },
      'Préstamo renovado'
    )

    return NextResponse.json({
      message: 'Préstamo renovado exitosamente',
      nuevaFechaLimite: nuevaFecha.toISOString(),
      renewalCount: renewalCount + 1,
    })
  } catch (error) {
    apiLogger.error({ err: error }, 'Error en renew-loan')
    return NextResponse.json({ error: 'Error al renovar' }, { status: 500 })
  }
}
