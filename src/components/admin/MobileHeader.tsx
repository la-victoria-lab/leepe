'use client'

import type { ViewMode, NavItem } from './types'

type MobileHeaderProps = {
  viewMode: ViewMode
  userName: string
  navItems: NavItem[]
}

export function MobileHeader({ viewMode, userName, navItems }: MobileHeaderProps) {
  return (
    <div className="md:hidden shrink-0 flex items-center justify-between px-6 py-4 bg-stone-50/80 backdrop-blur-md sticky top-0 z-30 border-b border-stone-100">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-black text-slate-800 tracking-tight">
          {navItems.find((i) => i.id === viewMode)?.label}
        </h1>
      </div>

      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-[2px] shadow-sm">
        <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
          <span className="font-bold text-violet-600 text-sm">{userName.charAt(0).toUpperCase()}</span>
        </div>
      </div>
    </div>
  )
}
