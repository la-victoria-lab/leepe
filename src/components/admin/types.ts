import type { LucideIcon } from 'lucide-react'

export type ViewMode = 'loans' | 'register' | 'catalog' | 'user'

export type NavItem = {
  id: ViewMode
  label: string
  icon: LucideIcon
  color: string
}
