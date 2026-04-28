'use client'

import { useState } from 'react'
import { BookOpenCheck, Library, MapPin, UploadCloud, User } from 'lucide-react'
import { cn } from '@/lib/utils'

import RegisterBooksTab from './RegisterBooksTab'
import LoansHistory from './LoansHistory'
import UserPageClient from './UserPageClient'
import BookCatalog from './BookCatalog'
import EspaciosTab from './EspaciosTab'

import { DesktopNav } from './admin/DesktopNav'
import { MobileNav } from './admin/MobileNav'
import { MobileHeader } from './admin/MobileHeader'
import type { ViewMode, NavItem } from './admin/types'

type AdminPageClientProps = {
  userName: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'loans', label: 'Préstamos', icon: BookOpenCheck, color: 'text-blue-500' },
  { id: 'catalog', label: 'Catálogo', icon: Library, color: 'text-violet-500' },
  { id: 'espacios', label: 'Espacios', icon: MapPin, color: 'text-amber-500' },
  { id: 'register', label: 'Carga', icon: UploadCloud, color: 'text-emerald-500' },
  { id: 'user', label: 'Usuario', icon: User, color: 'text-pink-500' },
]

export default function AdminPageClient({ userName }: AdminPageClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('loans')

  return (
    <div className="h-[100dvh] bg-stone-50 flex flex-col md:flex-row relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-violet-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-200/40 rounded-full blur-[80px] pointer-events-none mix-blend-multiply" />
      <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] bg-pink-200/30 rounded-full blur-[80px] pointer-events-none mix-blend-multiply" />

      {/* Desktop Sidebar */}
      <DesktopNav
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        userName={userName}
        navItems={NAV_ITEMS}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        {/* Mobile Header */}
        <MobileHeader
          viewMode={viewMode}
          userName={userName}
          navItems={NAV_ITEMS}
        />

        {/* Content */}
        <div
          className={cn(
            'flex-1 overflow-y-auto scroll-smooth no-scrollbar md:p-8 md:pb-8',
            viewMode === 'user' ? 'p-0 pb-0' : 'p-0 pb-32'
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

              {viewMode === 'espacios' && (
                <div className="pt-4 md:pt-0">
                  <EspaciosTab />
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

        {/* Mobile Bottom Navigation */}
        <MobileNav
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          navItems={NAV_ITEMS}
        />
      </div>
    </div>
  )
}
