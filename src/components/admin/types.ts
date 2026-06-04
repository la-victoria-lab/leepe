import type { LucideIcon } from 'lucide-react'

export type ViewMode = 'dashboard' | 'loans' | 'verify' | 'register' | 'catalog' | 'roles' | 'forum' | 'user'

export type NavItem = {
  id: ViewMode
  label: string
  icon: LucideIcon
  color: string
}
