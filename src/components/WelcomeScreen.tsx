'use client'

import { useEffect, useState } from 'react'
import { ScanBarcode, BookOpen, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type WelcomeScreenProps = {
  userName: string
  onSelectLend: () => void
  onReturnSuccess?: () => void
}

type Prestamo = {
  id: number
  libro_isbn: string
  persona: string
  fecha_prestamo: string
  libros: {
    titulo: string
    autores: string | null
    thumbnail: string | null
  }
}

export default function WelcomeScreen({ userName, onSelectLend, onReturnSuccess }: WelcomeScreenProps) {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(true)
  const [returningIsbn, setReturningIsbn] = useState<string | null>(null)
  const [returnError, setReturnError] = useState<string>('')
  const [confirmReturn, setConfirmReturn] = useState<Prestamo | null>(null)

  const fetchPrestamos = async () => {
    try {
      const response = await fetch('/api/user-loans')
      if (response.ok) {
        const data = await response.json()
        setPrestamos(data)
      }
    } catch (error) {
      console.error('[WelcomeScreen] Error fetching loans:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrestamos()
  }, [])

  const handleReturnClick = (prestamo: Prestamo) => {
    setConfirmReturn(prestamo)
    setReturnError('')
  }

  const handleConfirmReturn = async () => {
    if (!confirmReturn || returningIsbn) return

    const isbn = confirmReturn.libro_isbn
    setReturningIsbn(isbn)
    setConfirmReturn(null)

    try {
      const response = await fetch('/api/return-book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isbn }),
      })

      if (!response.ok) {
        let errorMessage = 'Error al devolver libro'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = response.statusText || `Error ${response.status}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      await fetchPrestamos()
      if (onReturnSuccess) {
        onReturnSuccess()
      }
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setReturningIsbn(null)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 py-2 overflow-hidden w-full max-w-md mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-8 shrink-0 animate-in slide-in-from-bottom-8 duration-700">
        <h1 className="text-[3.5rem] font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-600 to-fuchsia-600 leading-tight tracking-tighter drop-shadow-sm mb-2 font-display">
          LEE(PE)
        </h1>
        <p className="text-lg font-medium text-slate-500">
          ¿Qué vas a leer hoy, <span className="text-violet-600 font-bold">{userName.split(' ')[0]}</span>?
        </p>
      </div>

      {/* Main Action Button */}
      <div className="w-full mb-8 shrink-0 animate-in zoom-in-95 duration-500 delay-100">
        <button
          type="button"
          onClick={onSelectLend}
          className="group relative w-full py-8 md:py-10 rounded-[2.5rem] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="relative z-10 flex flex-col items-center justify-center gap-2">
            <ScanBarcode
              size={48}
              strokeWidth={2.5}
              className="mb-1 drop-shadow-md"
            />
            <span className="text-2xl md:text-3xl font-black tracking-tight drop-shadow-md">Escanear Libro</span>
            <span className="text-white/80 text-sm font-medium bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              Toca para abrir la cámara
            </span>
          </div>
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-y-[100%] group-hover:translate-y-[-100%] transition-transform duration-700 pointer-events-none" />
        </button>
      </div>

      {/* Loans Section */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="h-2 w-24 bg-slate-200 rounded-full"></div>
            <span className="text-xs">Cargando tus libros...</span>
          </div>
        </div>
      ) : prestamos.length > 0 ? (
        <div className="flex-1 min-h-0 flex flex-col animate-in slide-in-from-bottom-10 duration-700 delay-200">
          <div className="flex items-center gap-2 mb-4 px-2">
            <BookOpen
              size={18}
              className="text-violet-500"
            />
            <h3 className="text-lg font-bold text-slate-800">Tus Préstamos</h3>
            <span className="bg-violet-100 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {prestamos.length}
            </span>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 px-1 pb-4 space-y-4 no-scrollbar">
            {prestamos.map((prestamo) => (
              <div
                key={prestamo.id}
                className="group relative bg-white border border-violet-100 rounded-[1.5rem] p-3 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-violet-200/50 hover:scale-[1.02] transition-all duration-300 flex gap-4 overflow-hidden"
              >
                {/* Book Cover */}
                <div className="shrink-0 relative w-20 aspect-[2/3] rounded-xl overflow-hidden shadow-md bg-slate-100">
                  {prestamo.libros.thumbnail ? (
                    <img
                      src={prestamo.libros.thumbnail}
                      alt={prestamo.libros.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-violet-50">
                      <BookOpen className="text-violet-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                  <div>
                    <h4 className="font-bold text-slate-900 leading-tight mb-1 line-clamp-2">
                      {prestamo.libros.titulo}
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 mb-2 truncate">
                      {prestamo.libros.autores || 'Autor desconocido'}
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-2 mt-2">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">
                      <Clock size={10} />
                      {new Date(prestamo.fecha_prestamo).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleReturnClick(prestamo)}
                      disabled={returningIsbn === prestamo.libro_isbn}
                      className={cn(
                        'h-8 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:shadow-none transition-colors',
                        returningIsbn === prestamo.libro_isbn && 'opacity-50'
                      )}
                    >
                      {returningIsbn === prestamo.libro_isbn ? '...' : 'Devolver'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60 animate-in fade-in duration-1000">
          <p className="text-slate-400 font-medium text-lg">No tienes libros prestados.</p>
          <p className="text-slate-300 text-sm mt-1">¡Escanea uno para empezar!</p>
        </div>
      )}

      {/* Error Toast */}
      {returnError && (
        <div className="absolute bottom-4 left-4 right-4 animate-in slide-in-from-bottom-4 fade-in duration-300 z-50">
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-sm shadow-lg flex items-center gap-3">
            <AlertCircle className="shrink-0 text-red-500" />
            <p className="font-medium">{returnError}</p>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <Dialog
        open={!!confirmReturn}
        onOpenChange={(open) => !open && setConfirmReturn(null)}
      >
        <DialogContent className="rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl sm:max-w-md w-full bg-slate-50 gap-0">
          {confirmReturn && (
            <>
              <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 p-8 pt-10 pb-16 text-center text-white relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
                <h3 className="text-2xl font-black mb-1 tracking-tight relative z-10">¿Devolver Libro?</h3>
                <p className="text-white/90 text-sm font-medium relative z-10">Confirma que tienes el libro contigo</p>
              </div>

              <div className="px-6 pb-8 flex flex-col items-center text-center relative mt-[-3rem]">
                {/* Floating Cover */}
                <div className="w-28 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-4 ring-white bg-white mx-auto relative z-20 transition-transform duration-500 hover:scale-105">
                  {confirmReturn?.libros.thumbnail ? (
                    <img
                      src={confirmReturn.libros.thumbnail}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                      <BookOpen className="text-slate-300" />
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-1 w-full">
                  <h4 className="font-bold text-xl text-slate-800 leading-tight line-clamp-2">
                    {confirmReturn?.libros.titulo}
                  </h4>
                  <p className="text-sm text-slate-500 font-medium line-clamp-1">{confirmReturn?.libros.autores}</p>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  onClick={() => setConfirmReturn(null)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-bold hover:bg-black shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  onClick={handleConfirmReturn}
                  disabled={!!returningIsbn}
                >
                  {returningIsbn ? 'Procesando...' : 'Sí, devolver'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
