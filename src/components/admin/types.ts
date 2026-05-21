import type { LucideIcon } from 'lucide-react'

export type ViewMode = 'dashboard' | 'loans' | 'register' | 'catalog' | 'espacios' | 'qr' | 'roles' | 'user'

export type NavItem = {
  id: ViewMode
  label: string
  icon: LucideIcon
  color: string
}
