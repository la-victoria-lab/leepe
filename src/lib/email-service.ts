import { Resend } from 'resend'
import { LOAN_CONFIG } from './loan-config'

const resend = new Resend(process.env.RESEND_API_KEY)

interface BookBorrowedData {
  bookTitle: string
  bookAuthor: string | null
  borrowerName: string
  borrowerEmail: string
  dueDate: Date
}

interface RenewalReminderData {
  bookTitle: string
  borrowerEmail: string
  borrowerName: string
  daysUntilExpiry: number
  dueDate: Date
  loanId: string
}

interface RenewalConfirmationData {
  bookTitle: string
  borrowerName: string
  borrowerEmail: string
  newDueDate: Date
  renewalCount: number
  maxRenewals: number
}

/**
 * Envía notificación a admins cuando se solicita un préstamo
 */
export async function sendBookBorrowedNotification(data: BookBorrowedData) {
  try {
    const formattedDate = data.dueDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const html = `
      <h2>Nueva Solicitud de Préstamo</h2>
      <p><strong>Libro:</strong> ${data.bookTitle}</p>
      ${data.bookAuthor ? `<p><strong>Autor:</strong> ${data.bookAuthor}</p>` : ''}
      <p><strong>Solicitante:</strong> ${data.borrowerName}</p>
      <p><strong>Email:</strong> ${data.borrowerEmail}</p>
      <p><strong>Fecha de Vencimiento:</strong> ${formattedDate}</p>
      <hr />
      <p style="color: #666; font-size: 12px;">
        Este es un mensaje automático del sistema LEEPE.
        No responder a este email.
      </p>
    `

    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@leepe.lavictoria.pe',
      to: LOAN_CONFIG.ADMIN_EMAILS,
      subject: `[LEEPE] Nueva solicitud: ${data.bookTitle}`,
      html,
    })

    if (response.error) {
      console.error('Error sending book borrowed notification:', response.error)
      return false
    }

    console.log('Book borrowed notification sent:', response.data?.id)
    return true
  } catch (error) {
    console.error('Exception in sendBookBorrowedNotification:', error)
    return false
  }
}

/**
 * Envía recordatorio al usuario 1 semana antes del vencimiento
 */
export async function sendRenewalReminderEmail(data: RenewalReminderData) {
  try {
    const formattedDate = data.dueDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const html = `
      <h2>Recordatorio: Tu Préstamo Vence Pronto</h2>
      <p>Hola <strong>${data.borrowerName}</strong>,</p>
      <p>Tu préstamo del libro <strong>"${data.bookTitle}"</strong> vence en <strong>${data.daysUntilExpiry} día${data.daysUntilExpiry === 1 ? '' : 's'}</strong>.</p>
      <p><strong>Fecha de Vencimiento:</strong> ${formattedDate}</p>
      <p>Puedes renovar tu préstamo por 15 días más a través del portal LEEPE.</p>
      <hr />
      <p style="color: #666; font-size: 12px;">
        Este es un mensaje automático del sistema LEEPE.
        Si tienes preguntas, contacta a bizops@lavictoria.pe
      </p>
    `

    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@leepe.lavictoria.pe',
      to: [data.borrowerEmail],
      subject: `[LEEPE] Recordatorio: Tu préstamo vence en ${data.daysUntilExpiry} día${data.daysUntilExpiry === 1 ? '' : 's'}`,
      html,
    })

    if (response.error) {
      console.error('Error sending renewal reminder:', response.error)
      return false
    }

    console.log('Renewal reminder sent:', response.data?.id)
    return true
  } catch (error) {
    console.error('Exception in sendRenewalReminderEmail:', error)
    return false
  }
}

/**
 * Envía confirmación cuando se renueva un préstamo
 */
export async function sendRenewalConfirmation(data: RenewalConfirmationData) {
  try {
    const formattedDate = data.newDueDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const renewalsLeft = data.maxRenewals - data.renewalCount
    const renewalStatus =
      renewalsLeft > 0
        ? `Aún puedes renovar ${renewalsLeft} vez${renewalsLeft === 1 ? '' : 's'} más.`
        : 'Ya no puedes renovar más este préstamo.'

    const html = `
      <h2>Préstamo Renovado</h2>
      <p>Hola <strong>${data.borrowerName}</strong>,</p>
      <p>Tu préstamo del libro <strong>"${data.bookTitle}"</strong> ha sido renovado exitosamente.</p>
      <p><strong>Nueva Fecha de Vencimiento:</strong> ${formattedDate}</p>
      <p><strong>Renovaciones Utilizadas:</strong> ${data.renewalCount}/${data.maxRenewals}</p>
      <p>${renewalStatus}</p>
      <hr />
      <p style="color: #666; font-size: 12px;">
        Este es un mensaje automático del sistema LEEPE.
        Si tienes preguntas, contacta a bizops@lavictoria.pe
      </p>
    `

    // Enviar al usuario y a los admins
    const emailsToSend = [data.borrowerEmail, ...LOAN_CONFIG.ADMIN_EMAILS]

    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@leepe.lavictoria.pe',
      to: emailsToSend,
      subject: `[LEEPE] Préstamo renovado: ${data.bookTitle}`,
      html,
    })

    if (response.error) {
      console.error('Error sending renewal confirmation:', response.error)
      return false
    }

    console.log('Renewal confirmation sent:', response.data?.id)
    return true
  } catch (error) {
    console.error('Exception in sendRenewalConfirmation:', error)
    return false
  }
}
