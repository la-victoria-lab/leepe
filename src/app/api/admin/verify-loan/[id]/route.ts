import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

/**
 * POST /api/admin/verify-loan/[id]
 * Marca un préstamo devuelto como verificado por admin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { id } = await params

  try {
    // Verificar que el préstamo existe y está devuelto
    const { data: loan, error: fetchError } = await auth.supabase
      .from('prestamos')
      .select('id, devuelto')
      .eq('id', id)
      .single()

    if (fetchError || !loan) {
      return NextResponse.json(
        { error: 'Préstamo no encontrado' },
        { status: 404 }
      )
    }

    if (!loan.devuelto) {
      return NextResponse.json(
        { error: 'Solo se pueden verificar préstamos devueltos' },
        { status: 400 }
      )
    }

    // Marcar como verificado
    const { error: updateError } = await auth.supabase
      .from('prestamos')
      .update({
        verificado: true,
        fecha_verificado: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('[admin/verify-loan] Error:', updateError)
      return NextResponse.json(
        { error: 'Error al verificar préstamo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Préstamo verificado correctamente',
    })
  } catch (error) {
    console.error('[admin/verify-loan POST] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
