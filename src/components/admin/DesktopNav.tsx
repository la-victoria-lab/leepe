'use client'

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ViewMode, NavItem } from './types'

type DesktopNavProps = {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  userName: string
  navItems: NavItem[]
}

export function DesktopNav({ viewMode, onViewModeChange, userName, navItems }: DesktopNavProps) {
  return (
    <div className="hidden md:flex flex-col w-72 p-4 z-20">
      <div className="h-full bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-[2rem] flex flex-col overflow-hidden">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-xl shadow-lg shadow-violet-500/30 text-white">
              <Sparkles
                size={20}
                fill="currentColor"
              />
            </div>
            <h1
              className="text-2xl font-bold tracking-tight text-slate-800"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              LEE(PE)
            </h1>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 pl-1">Panel Admin</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 py-4">
          {navItems.map((item) => {
            const isActive = viewMode === item.id
            return (
              <button
                key={item.id}
                onClick={() => onViewModeChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 group',
                  isActive
                    ? 'bg-white shadow-soft text-slate-900 border border-violet-100'
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-700 hover:scale-[1.02]'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-xl transition-all duration-300',
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-400 group-hover:text-slate-600 shadow-sm'
                  )}
                >
                  <item.icon
                    className="w-4 h-4"
                    strokeWidth={2.5}
                  />
                </div>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-gradient-to-br from-violet-100 to-indigo-50 rounded-2xl p-4 border border-violet-100">
            <p className="text-xs font-bold text-violet-400 uppercase mb-1">Usuario</p>
            <p className="text-sm font-bold text-violet-900 truncate">{userName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
