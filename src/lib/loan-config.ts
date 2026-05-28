/**
 * Configuración global para préstamos de libros
 * Centraliza todos los parámetros de duración y límites
 */

export const LOAN_CONFIG = {
  /** Duración inicial del préstamo en días (1 mes) */
  INITIAL_DAYS: 30,

  /** Duración de cada renovación en días */
  RENEWAL_DAYS: 15,

  /** Días antes del vencimiento para enviar recordatorio */
  REMINDER_DAYS_BEFORE: 7,

  /** Número máximo de renovaciones permitidas */
  MAX_RENEWALS: 1,

  /** Emails de los administradores que reciben notificaciones */
  ADMIN_EMAILS: ['bizops@lavictoria.pe', 'fabio@lavictoria.pe'],

  /** Dominio permitido para usuarios */
  ALLOWED_DOMAIN: '@lavictoria.pe',
} as const

/**
 * Calcula la fecha límite para un préstamo dado la fecha de inicio
 * @param startDate Fecha de inicio del préstamo
 * @param days Número de días a agregar
 * @returns Fecha límite como Date object
 */
export function calculateDueDate(startDate: Date, days: number = LOAN_CONFIG.INITIAL_DAYS): Date {
  const dueDate = new Date(startDate)
  dueDate.setDate(dueDate.getDate() + days)
  return dueDate
}

/**
 * Calcula cuántos días quedan hasta la fecha límite
 * @param dueDate Fecha límite del préstamo
 * @returns Número de días (negativo si está vencido)
 */
export function daysUntilDue(dueDate: Date): number {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const diffTime = due.getTime() - tomorrow.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Determina el estado visual de un préstamo según días restantes
 */
export function getLoanStatus(dueDate: Date): 'overdue' | 'critical' | 'warning' | 'ok' {
  const daysLeft = daysUntilDue(dueDate)

  if (daysLeft < 0) return 'overdue'
  if (daysLeft <= 3) return 'critical'
  if (daysLeft <= LOAN_CONFIG.REMINDER_DAYS_BEFORE) return 'warning'
  return 'ok'
}

/**
 * Formatea un mensaje de estado del préstamo para mostrar al usuario
 */
export function formatLoanStatus(dueDate: Date): string {
  const daysLeft = daysUntilDue(dueDate)

  if (daysLeft < 0) {
    return `Vencido hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) === 1 ? '' : 's'}`
  }

  if (daysLeft === 0) {
    return 'Vence hoy'
  }

  return `Vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`
}
