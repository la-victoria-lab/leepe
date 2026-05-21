'use client'

import { useState } from 'react'
import { ArrowLeft, BookOpen, ScanBarcode, Library } from 'lucide-react'
import WelcomeScreen from './WelcomeScreen'
import LendBookTab from './LendBookTab'
import LogoutButton from './LogoutButton'
import UserCatalogTab from './UserCatalogTab'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type UserPageClientProps = {
  userName: string
  embedded?: boolean
}

type ViewMode = 'welcome' | 'lend' | 'catalog'

export default function UserPageClient({ userName, embedded = false }: UserPageClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('welcome')

  const title = viewMode === 'lend' ? 'Escanear Libro' : ''

  // Animaciones de entrada suaves
  const containerClass = embedded
    ? 'h-full flex flex-col relative overflow-hidden'
    : 'h-[100dvh] flex flex-col relative overflow-hidden bg-stone-50'

  return (
    <div className={containerClass}>
      {/* Background Decorativo (Solo si NO estamos en modo cámara/Lend) */}
      {!embedded && viewMode !== 'lend' && (
        <>
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-100/50 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-100/50 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
        </>
      )}

      {/* Header Full Width */}
      <header
        className={cn(
          'shrink-0 z-20 flex items-center justify-between px-4 py-3 transition-all duration-300 w-full',
          viewMode === 'lend' ? 'absolute top-0 left-0 bg-transparent text-white' : 'relative bg-transparent', // Header flotante transparente en modo cámara
          embedded && 'hidden' // Ocultar header completo si es embedded, ya que la navegación principal lo maneja (o el botón de volver de LendBookTab)
        )}
      >
        {/* Izquierda: Navegación o Avatar */}
        <div className="flex items-center gap-3">
          {viewMode !== 'welcome' ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setViewMode('welcome')}
              className={cn(
                'h-10 w-10 rounded-full transition-all active:scale-95',
                viewMode === 'lend'
                  ? 'bg-black/20 text-white hover:bg-black/40 backdrop-blur-md'
                  : 'hover:bg-stone-100 text-stone-600'
              )}
            >
              <ArrowLeft
                className="h-6 w-6"
                strokeWidth={2.5}
              />
            </Button>
          ) : (
            // Avatar de Usuario
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-[2px] shadow-sm">
                <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
                  <span className="font-bold text-violet-600 text-sm">{userName.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              {!embedded && (
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">Hola</span>
                  <span className="text-sm font-bold text-stone-800 line-clamp-1 max-w-[150px]">
                    {userName.split(' ')[0]}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Derecha: Logout */}
        <div className="flex items-center gap-2">
          <LogoutButton
            className={cn(
              'h-10 w-10 rounded-full transition-colors',
              viewMode === 'lend'
                ? 'text-white/80 hover:text-white hover:bg-white/10'
                : 'text-stone-400 hover:text-red-500 hover:bg-red-50'
            )}
            iconOnly
          />
        </div>
      </header>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10 w-full">
        {viewMode === 'lend' ? (
          <div className="flex-1 h-full w-full animate-in fade-in zoom-in-95 duration-300 bg-black">
            <LendBookTab onSuccess={() => setViewMode('welcome')} />
          </div>
        ) : viewMode === 'catalog' ? (
          <div className="flex-1 h-full w-full overflow-hidden flex flex-col pb-16">
            <div className="px-4 pt-4 pb-1 shrink-0">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Catálogo</h2>
              <p className="text-xs text-slate-400 font-medium">Busca y pide libros disponibles</p>
            </div>
            <UserCatalogTab onBorrow={() => setViewMode('welcome')} />
          </div>
        ) : (
          <div className="flex-1 h-full w-full overflow-y-auto no-scrollbar pb-16">
            <WelcomeScreen
              userName={userName}
              onSelectLend={() => setViewMode('lend')}
              onReturnSuccess={() => setViewMode('welcome')}
            />
          </div>
        )}
      </div>

      {/* Bottom Nav (solo cuando no estamos en modo cámara) */}
      {viewMode !== 'lend' && !embedded && (
        <nav className="absolute bottom-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md border-t border-slate-100 flex">
          {[
            { id: 'welcome' as ViewMode, icon: BookOpen, label: 'Mis libros' },
            { id: 'lend' as ViewMode, icon: ScanBarcode, label: 'Escanear', highlight: true },
            { id: 'catalog' as ViewMode, icon: Library, label: 'Catálogo' },
          ].map(({ id, icon: Icon, label, highlight }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors',
                highlight
                  ? 'text-violet-600'
                  : viewMode === id
                  ? 'text-violet-600'
                  : 'text-slate-400'
              )}
            >
              <Icon size={20} strokeWidth={viewMode === id ? 2.5 : 1.8} />
              <span className={cn(
                'text-[10px] font-bold',
                viewMode === id ? 'text-violet-600' : 'text-slate-400'
              )}>
                {label}
              </span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
