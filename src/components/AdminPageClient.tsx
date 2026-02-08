'use client'

import { useState } from 'react'
import { BookOpenCheck, Library, UploadCloud, User, Sparkles } from 'lucide-react'
import RegisterBooksTab from './RegisterBooksTab'
import LoansHistory from './LoansHistory'
import UserPageClient from './UserPageClient'
import BookCatalog from './BookCatalog'
import { cn } from '@/lib/utils'

type AdminPageClientProps = {
  userName: string
}

type ViewMode = 'loans' | 'register' | 'catalog' | 'user'

export default function AdminPageClient({ userName }: AdminPageClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('loans')

  const navItems = [
    { id: 'loans' as ViewMode, label: 'Préstamos', icon: BookOpenCheck, color: 'text-blue-500' },
    { id: 'catalog' as ViewMode, label: 'Catálogo', icon: Library, color: 'text-violet-500' },
    { id: 'register' as ViewMode, label: 'Carga', icon: UploadCloud, color: 'text-emerald-500' },
    { id: 'user' as ViewMode, label: 'Usuario', icon: User, color: 'text-pink-500' },
  ]

  return (
    <div className="h-[100dvh] bg-stone-50 flex flex-col md:flex-row relative overflow-hidden">
      {/* Background Blobs - Juguetón */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-violet-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-200/40 rounded-full blur-[80px] pointer-events-none mix-blend-multiply" />
      <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] bg-pink-200/30 rounded-full blur-[80px] pointer-events-none mix-blend-multiply" />

      {/* Desktop Sidebar - Floating Card Style */}
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
                  onClick={() => setViewMode(item.id)}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        {/* Mobile Header - Unified Style */}
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

        {/* Content */}
        <div
          className={cn(
            'flex-1 overflow-y-auto scroll-smooth no-scrollbar md:p-8 md:pb-8',
            viewMode === 'user' ? 'p-0 pb-0' : 'p-0 pb-32' // Full screen for user, padded for others
          )}
        >
          {viewMode === 'user' ? (
            <div className="h-full overflow-hidden">
              <UserPageClient
                userName={userName}
                embedded
              />
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6 px-4 md:px-0">
              {viewMode === 'loans' && <LoansHistory />}
              {viewMode === 'catalog' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="mb-6 hidden md:block">
                    <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Catálogo</h2>
                    <p className="text-slate-500 font-medium">Gestiona tu colección de libros</p>
                  </div>
                  <BookCatalog />
                </div>
              )}
              {viewMode === 'register' && (
                <div className="animate-in zoom-in-95 duration-300 pt-4 md:pt-0">
                  <h2 className="text-3xl font-black mb-6 text-slate-800 tracking-tight hidden md:block">
                    Carga Masiva
                  </h2>
                  <RegisterBooksTab />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation - Floating Island */}
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl shadow-indigo-500/20 p-2 flex justify-between items-center h-[72px] relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 via-transparent to-pink-500/20 pointer-events-none" />

            {navItems.map((item) => {
              const isActive = viewMode === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setViewMode(item.id)}
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
      </div>
    </div>
  )
}
