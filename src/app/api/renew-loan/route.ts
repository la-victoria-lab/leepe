import { NextRequest, NextResponse } from 'next/server'
import { requireCompanyUser } from '@/lib/api-auth'
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

    // Nueva fecha límite: 14 días desde hoy (o desde la fecha_limite actual si aún no venció)
    const hoy = new Date()
    const limiteActual = prestamo.fecha_limite ? new Date(prestamo.fecha_limite) : hoy
    const baseDate = limiteActual > hoy ? limiteActual : hoy

    const nuevaFecha = new Date(baseDate)
    nuevaFecha.setDate(nuevaFecha.getDate() + 14)

    const { error: updateError } = await auth.supabase
      .from('prestamos')
      .update({ fecha_limite: nuevaFecha.toISOString() })
      .eq('id', prestamoId)

    if (updateError) {
      apiLogger.error({ err: updateError, prestamoId }, 'Error renovando préstamo')
      return NextResponse.json({ error: 'Error al renovar el préstamo' }, { status: 500 })
    }

    apiLogger.info({ prestamoId, borrower, nuevaFecha }, 'Préstamo renovado')

    return NextResponse.json({
      message: 'Préstamo renovado exitosamente',
      nuevaFechaLimite: nuevaFecha.toISOString(),
    })
  } catch (error) {
    apiLogger.error({ err: error }, 'Error en renew-loan')
    return NextResponse.json({ error: 'Error al renovar' }, { status: 500 })
  }
}
