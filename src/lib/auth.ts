export const allowedEmailDomain = 'lavictoria.pe'
export const adminEmails = [
  'fabio@lavictoria.pe'
]

export type UserRole = 'admin' | 'user'

export function isAllowedCompanyEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  return normalizedEmail.endsWith(`@${allowedEmailDomain}`)
}

export function isAdminEmail(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase()
  return adminEmails.some(adminEmail => adminEmail.trim().toLowerCase() === normalizedEmail)
}

export function getRoleForEmail(email: string): UserRole {
  return isAdminEmail(email) ? 'admin' : 'user'
}


