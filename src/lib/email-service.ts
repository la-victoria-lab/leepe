import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { LOAN_CONFIG } from './loan-config'

// Crear transporte de Gmail
const createTransporter = (): Transporter | null => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) {
    console.error('Missing GMAIL_USER or GMAIL_PASSWORD environment variables')
    return null
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD,
    },
  })
}

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

interface BookReturnedData {
  bookTitle: string
  bookAuthor: string | null
  borrowerName: string
  borrowerEmail: string
  returnDate: Date
}

/**
 * Envía confirmación de préstamo al usuario
 */
export async function sendBookBorrowedToUser(data: BookBorrowedData) {
  try {
    const transporter = createTransporter()
    if (!transporter) {
      console.error('Failed to create email transporter')
      return false
    }

    const formattedDate = data.dueDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #27ae60;">✅ Libro Prestado Exitosamente</h2>
        <p>Hola <strong>${data.borrowerName}</strong>,</p>
        <p>Tu solicitud de préstamo ha sido registrada. Aquí están los detalles:</p>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 15px 0;">
          <p><strong>📖 Libro:</strong> ${data.bookTitle}</p>
          ${data.bookAuthor ? `<p><strong>✍️ Autor:</strong> ${data.bookAuthor}</p>` : ''}
          <p><strong>📅 Fecha de Vencimiento:</strong> ${formattedDate}</p>
          <p style="color: #e74c3c; margin-top: 10px;"><strong>⏰ Importante:</strong> Debes devolver el libro antes de esta fecha.</p>
        </div>
        <p>Una semana antes del vencimiento recibirás un recordatorio en tu correo.</p>
        <p>Si necesitas renovar el préstamo, podrás hacerlo desde el portal LEEPE.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Este es un mensaje automático del sistema LEEPE.
          Si tienes preguntas, contacta a bizops@lavictoria.pe
        </p>
      </div>
    `

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: data.borrowerEmail,
      subject: `[LEEPE] Confirmación: Prestado "${data.bookTitle}"`,
      html,
    })

    console.log('Book borrowed confirmation sent to:', data.borrowerEmail)
    return true
  } catch (error) {
    console.error('Exception in sendBookBorrowedToUser:', error)
    return false
  }
}

/**
 * Envía notificación a admins cuando se solicita un préstamo
 */
export async function sendBookBorrowedNotification(data: BookBorrowedData) {
  try {
    const transporter = createTransporter()
    if (!transporter) {
      console.error('Failed to create email transporter')
      return false
    }

    const formattedDate = data.dueDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c3e50;">Nueva Solicitud de Préstamo</h2>
        <p><strong>📖 Libro:</strong> ${data.bookTitle}</p>
        ${data.bookAuthor ? `<p><strong>✍️ Autor:</strong> ${data.bookAuthor}</p>` : ''}
        <p><strong>👤 Solicitante:</strong> ${data.borrowerName}</p>
        <p><strong>📧 Email:</strong> ${data.borrowerEmail}</p>
        <p><strong>📅 Fecha de Vencimiento:</strong> ${formattedDate}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Este es un mensaje automático del sistema LEEPE.
          No responder a este email.
        </p>
      </div>
    `

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: LOAN_CONFIG.ADMIN_EMAILS.join(','),
      subject: `[LEEPE] Nueva solicitud: ${data.bookTitle}`,
      html,
    })

    console.log('Book borrowed notification sent to:', LOAN_CONFIG.ADMIN_EMAILS)
    return true
  } catch (error) {
    console.error('Exception in sendBookBorrowedNotification:', error)
    return false
  }
}

/**
 * Envía confirmación de devolución al usuario
 */
export async function sendBookReturnedToUser(data: BookReturnedData) {
  try {
    const transporter = createTransporter()
    if (!transporter) {
      console.error('Failed to create email transporter')
      return false
    }

    const formattedDate = data.returnDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #27ae60;">✅ Devolución Registrada</h2>
        <p>Hola <strong>${data.borrowerName}</strong>,</p>
        <p>Tu devolución del siguiente libro ha sido registrada en el sistema:</p>
        <p style="background: #f9f9f9; padding: 15px; border-left: 4px solid #27ae60; margin: 15px 0;">
          <strong style="color: #27ae60;">📖 Libro:</strong> ${data.bookTitle}<br/>
          ${data.bookAuthor ? `<strong>✍️ Autor:</strong> ${data.bookAuthor}<br/>` : ''}
          <strong>📅 Fecha de Devolución:</strong> ${formattedDate}
        </p>
        <p style="color: #666;">El libro será verificado físicamente por el equipo administrativo en los próximos días.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Este es un mensaje automático del sistema LEEPE.
          Si tienes preguntas, contacta a bizops@lavictoria.pe
        </p>
      </div>
    `

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: data.borrowerEmail,
      subject: `[LEEPE] Devolución Registrada: ${data.bookTitle}`,
      html,
    })

    console.log('Book returned notification sent to:', data.borrowerEmail)
    return true
  } catch (error) {
    console.error('Exception in sendBookReturnedToUser:', error)
    return false
  }
}

/**
 * Envía notificación a admins cuando se devuelve un libro
 */
export async function sendBookReturnedNotification(data: BookReturnedData) {
  try {
    const transporter = createTransporter()
    if (!transporter) {
      console.error('Failed to create email transporter')
      return false
    }

    const formattedDate = data.returnDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c3e50;">📖 Devolución Registrada</h2>
        <p><strong>Libro:</strong> ${data.bookTitle}</p>
        ${data.bookAuthor ? `<p><strong>Autor:</strong> ${data.bookAuthor}</p>` : ''}
        <p><strong>Usuario que devolvió:</strong> ${data.borrowerName}</p>
        <p><strong>Email:</strong> ${data.borrowerEmail}</p>
        <p><strong>Fecha de Devolución:</strong> ${formattedDate}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Este es un mensaje automático del sistema LEEPE.
          La devolución está pendiente de verificación física.
          No responder a este email.
        </p>
      </div>
    `

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: LOAN_CONFIG.ADMIN_EMAILS.join(','),
      subject: `[LEEPE] Devolución: ${data.bookTitle}`,
      html,
    })

    console.log('Book return notification sent to admins:', LOAN_CONFIG.ADMIN_EMAILS)
    return true
  } catch (error) {
    console.error('Exception in sendBookReturnedNotification:', error)
    return false
  }
}

/**
 * Envía recordatorio al usuario 1 semana antes del vencimiento
 */
export async function sendRenewalReminderEmail(data: RenewalReminderData) {
  try {
    const transporter = createTransporter()
    if (!transporter) {
      console.error('Failed to create email transporter')
      return false
    }

    const formattedDate = data.dueDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #e74c3c;">⏰ Recordatorio: Tu Préstamo Vence Pronto</h2>
        <p>Hola <strong>${data.borrowerName}</strong>,</p>
        <p>Tu préstamo del libro <strong>"${data.bookTitle}"</strong> vence en <strong style="color: #e74c3c;">${data.daysUntilExpiry} día${data.daysUntilExpiry === 1 ? '' : 's'}</strong>.</p>
        <p><strong>📅 Fecha de Vencimiento:</strong> ${formattedDate}</p>
        <p>Puedes renovar tu préstamo por 15 días más a través del portal LEEPE.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Este es un mensaje automático del sistema LEEPE.
          Si tienes preguntas, contacta a bizops@lavictoria.pe
        </p>
      </div>
    `

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: data.borrowerEmail,
      subject: `[LEEPE] Recordatorio: Tu préstamo vence en ${data.daysUntilExpiry} día${data.daysUntilExpiry === 1 ? '' : 's'}`,
      html,
    })

    console.log('Renewal reminder sent to:', data.borrowerEmail)
    return true
  } catch (error) {
    console.error('Exception in sendRenewalReminderEmail:', error)
    return false
  }
}

/**
 * Envía recordatorio a admins sobre préstamos que vencen en 7 días
 */
export async function sendExpiringLoansReminderToAdmins(data: {
  loans: Array<{
    bookTitle: string
    borrowerName: string
    borrowerEmail: string
    daysUntilExpiry: number
    dueDate: Date
  }>
}) {
  try {
    if (!data.loans || data.loans.length === 0) {
      console.log('No loans to remind admins about')
      return true
    }

    const transporter = createTransporter()
    if (!transporter) {
      console.error('Failed to create email transporter')
      return false
    }

    const loansHtml = data.loans
      .map((loan) => {
        const formattedDate = loan.dueDate.toLocaleDateString('es-ES', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${loan.bookTitle}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${loan.borrowerName}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${loan.borrowerEmail}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${formattedDate}</td>
          </tr>
        `
      })
      .join('')

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #e74c3c;">⏰ Recordatorio: Préstamos Próximos a Vencer</h2>
        <p>Se han detectado <strong>${data.loans.length}</strong> préstamo(s) que vence(n) en aproximadamente 7 días:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #333;">Libro</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #333;">Usuario</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #333;">Email</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #333;">Vencimiento</th>
            </tr>
          </thead>
          <tbody>
            ${loansHtml}
          </tbody>
        </table>
        <p>Considera contactar a estos usuarios para asegurar la devolución o renovación del libro.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Este es un mensaje automático del sistema LEEPE.
          No responder a este email.
        </p>
      </div>
    `

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: LOAN_CONFIG.ADMIN_EMAILS.join(','),
      subject: `[LEEPE] ⏰ ${data.loans.length} préstamo(s) próximo(s) a vencer`,
      html,
    })

    console.log('Expiring loans reminder sent to admins:', LOAN_CONFIG.ADMIN_EMAILS)
    return true
  } catch (error) {
    console.error('Exception in sendExpiringLoansReminderToAdmins:', error)
    return false
  }
}

/**
 * Envía confirmación cuando se renueva un préstamo
 */
export async function sendRenewalConfirmation(data: RenewalConfirmationData) {
  try {
    const transporter = createTransporter()
    if (!transporter) {
      console.error('Failed to create email transporter')
      return false
    }

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
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #27ae60;">✅ Préstamo Renovado</h2>
        <p>Hola <strong>${data.borrowerName}</strong>,</p>
        <p>Tu préstamo del libro <strong>"${data.bookTitle}"</strong> ha sido renovado exitosamente.</p>
        <p><strong>📅 Nueva Fecha de Vencimiento:</strong> ${formattedDate}</p>
        <p><strong>🔄 Renovaciones Utilizadas:</strong> ${data.renewalCount}/${data.maxRenewals}</p>
        <p>${renewalStatus}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Este es un mensaje automático del sistema LEEPE.
          Si tienes preguntas, contacta a bizops@lavictoria.pe
        </p>
      </div>
    `

    // Enviar al usuario y a los admins
    const emailsToSend = [data.borrowerEmail, ...LOAN_CONFIG.ADMIN_EMAILS]

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: emailsToSend.join(','),
      subject: `[LEEPE] Préstamo renovado: ${data.bookTitle}`,
      html,
    })

    console.log('Renewal confirmation sent to:', emailsToSend)
    return true
  } catch (error) {
    console.error('Exception in sendRenewalConfirmation:', error)
    return false
  }
}
