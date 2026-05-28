import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { daysUntilDue } from '@/lib/loan-config'
import * as emailService from '@/lib/email-service'

/**
 * Endpoint que envía recordatorios a usuarios cuyo préstamo vence en 7 días
 * Debe ser llamado una vez al día (via Vercel Cron, GitHub Actions, o similar)
 *
 * Autenticación: Requiere x-api-key header con valor de CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar que sea llamado con la clave secreta (protección básica)
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    // Obtener préstamos activos que vencen en aproximadamente 7 días
    // y que aún no han recibido recordatorio
    const { data: loans, error } = await supabase
      .from('prestamos')
      .select('id, libro_isbn, persona, fecha_limite, email_reminder_sent')
      .eq('devuelto', false)
      .eq('email_reminder_sent', false)
      .order('fecha_limite', { ascending: true })

    if (error) {
      console.error('Error fetching loans:', error)
      return NextResponse.json(
        { error: 'Error fetching loans', details: error.message },
        { status: 500 }
      )
    }

    if (!loans || loans.length === 0) {
      return NextResponse.json({
        message: 'No loans to remind',
        count: 0,
      })
    }

    let sentCount = 0
    let errorCount = 0
    const expiringLoans = []

    // Procesar cada préstamo
    for (const loan of loans) {
      const dueDate = new Date(loan.fecha_limite)
      const daysLeft = daysUntilDue(dueDate)

      // Enviar recordatorio si vence en aproximadamente 7 días
      // (permitir rango de 6-8 días para flexibilidad horaria)
      if (daysLeft >= 6 && daysLeft <= 8) {
        // Obtener información del libro y del usuario
        const { data: libro } = await supabase
          .from('libros')
          .select('titulo, autores')
          .eq('isbn', loan.libro_isbn)
          .single()

        if (!libro) {
          console.warn(`Book not found for ISBN: ${loan.libro_isbn}`)
          errorCount++
          continue
        }

        // Parsear el email del persona (formato: "email@domain.com" o "nombre@domain.com")
        const borrowerEmail = loan.persona.includes('@')
          ? loan.persona
          : `${loan.persona}@lavictoria.pe`

        // Enviar email al usuario
        const sent = await emailService.sendRenewalReminderEmail({
          bookTitle: libro.titulo,
          borrowerEmail,
          borrowerName: loan.persona,
          daysUntilExpiry: daysLeft,
          dueDate,
          loanId: loan.id,
        })

        if (sent) {
          // Marcar como enviado en la base de datos
          const { error: updateError } = await supabase
            .from('prestamos')
            .update({ email_reminder_sent: true })
            .eq('id', loan.id)

          if (updateError) {
            console.error(`Error marking reminder as sent for loan ${loan.id}:`, updateError)
            errorCount++
          } else {
            sentCount++
            // Agregar a la lista para notificación a admins
            expiringLoans.push({
              bookTitle: libro.titulo,
              borrowerName: loan.persona,
              borrowerEmail,
              daysUntilExpiry: daysLeft,
              dueDate,
            })
          }
        } else {
          errorCount++
        }
      }
    }

    // Enviar notificación a admins si hay préstamos próximos a vencer
    if (expiringLoans.length > 0) {
      await emailService.sendExpiringLoansReminderToAdmins({
        loans: expiringLoans,
      })
    }

    return NextResponse.json({
      message: 'Reminder task completed',
      total: loans.length,
      sent: sentCount,
      errors: errorCount,
      processed: sentCount + errorCount,
      adminNotified: expiringLoans.length > 0,
    })
  } catch (error) {
    console.error('Exception in send-loan-reminders:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST también está permitido para flexibilidad (para llamadas manuales)
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
