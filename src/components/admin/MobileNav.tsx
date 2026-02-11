'use client'

import { cn } from '@/lib/utils'
import type { ViewMode, NavItem } from './types'

type MobileNavProps = {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  navItems: NavItem[]
}

export function MobileNav({ viewMode, onViewModeChange, navItems }: MobileNavProps) {
  return (
    <div className="md:hidden fixed bottom-3 left-2 right-2 z-50">
      <div className="bg-slate-900/90 backdrop-blur-xl rounded-[1.5rem] border border-white/10 shadow-2xl shadow-indigo-500/20 p-2 flex justify-between items-center h-[72px] relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 via-transparent to-pink-500/20 pointer-events-none" />

        {navItems.map((item) => {
          const isActive = viewMode === item.id
          return (
            <button
              key={item.id}
              onClick={() => onViewModeChange(item.id)}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full rounded-2xl transition-all duration-300 active:scale-90',
                isActive ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'
              )}
            >
              <item.icon
                className={cn('transition-all duration-300', isActive ? 'w-6 h-6 rotate-[-10deg]' : 'w-5 h-5')}
                strokeWidth={isActive ? 2.5 : 2}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
