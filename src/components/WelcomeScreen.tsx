'use client'

import { useEffect, useState, useRef } from 'react'
import { ScanBarcode, BookOpen, Clock, AlertCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion'

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

// MOCK DATA FICTICIA - ACTIVA
const MOCK_PRESTAMOS: Prestamo[] = [
  {
    id: 1,
    libro_isbn: '978-0142437230',
    persona: 'Jerson',
    fecha_prestamo: new Date().toISOString(),
    libros: {
      titulo: 'Don Quijote de la Mancha',
      autores: 'Miguel de Cervantes',
      thumbnail: 'https://covers.openlibrary.org/b/id/7222246-L.jpg',
    },
  },
  {
    id: 2,
    libro_isbn: '978-0451524935',
    persona: 'Jerson',
    fecha_prestamo: new Date(Date.now() - 2 * 86400000).toISOString(),
    libros: {
      titulo: '1984',
      autores: 'George Orwell',
      thumbnail: 'https://covers.openlibrary.org/b/id/12613583-L.jpg',
    },
  },
  {
    id: 3,
    libro_isbn: '9780061120084',
    persona: 'Jerson',
    fecha_prestamo: new Date(Date.now() - 5 * 86400000).toISOString(),
    libros: {
      titulo: 'Cien Años de Soledad',
      autores: 'Gabriel García Márquez',
      thumbnail: 'https://covers.openlibrary.org/b/id/12693998-L.jpg',
    },
  },
  {
    id: 4,
    libro_isbn: '978-0345339706',
    persona: 'Jerson',
    fecha_prestamo: new Date(Date.now() - 8 * 86400000).toISOString(),
    libros: {
      titulo: 'El Señor de los Anillos',
      autores: 'J.R.R. Tolkien',
      thumbnail: 'https://covers.openlibrary.org/b/id/8353664-L.jpg',
    },
  },
  {
    id: 5,
    libro_isbn: '978-0747532743',
    persona: 'Jerson',
    fecha_prestamo: new Date(Date.now() - 10 * 86400000).toISOString(),
    libros: {
      titulo: 'Harry Potter y la Piedra Filosofal',
      autores: 'J.K. Rowling',
      thumbnail: 'https://covers.openlibrary.org/b/id/10522851-L.jpg',
    },
  },
  {
    id: 6,
    libro_isbn: '978-0140449136',
    persona: 'Jerson',
    fecha_prestamo: new Date(Date.now() - 12 * 86400000).toISOString(),
    libros: {
      titulo: 'Crimen y Castigo',
      autores: 'Fiódor Dostoyevski',
      thumbnail: 'https://covers.openlibrary.org/b/id/7222168-L.jpg',
    },
  },
  {
    id: 7,
    libro_isbn: '978-0307474728',
    persona: 'Jerson',
    fecha_prestamo: new Date(Date.now() - 15 * 86400000).toISOString(),
    libros: {
      titulo: 'Crónica de una muerte anunciada',
      autores: 'Gabriel García Márquez',
      thumbnail: 'https://covers.openlibrary.org/b/id/13280037-L.jpg',
    },
  },
  {
    id: 8,
    libro_isbn: '978-0141439518',
    persona: 'Jerson',
    fecha_prestamo: new Date(Date.now() - 20 * 86400000).toISOString(),
    libros: {
      titulo: 'Orgullo y Prejuicio',
      autores: 'Jane Austen',
      thumbnail: 'https://covers.openlibrary.org/b/id/8259449-L.jpg',
    },
  },
  {
    id: 9,
    libro_isbn: '978-0679783268',
    persona: 'Jerson',
    fecha_prestamo: new Date(Date.now() - 25 * 86400000).toISOString(),
    libros: {
      titulo: 'El Gran Gatsby',
      autores: 'F. Scott Fitzgerald',
      thumbnail: 'https://covers.openlibrary.org/b/id/8446927-L.jpg',
    },
  },
  {
    id: 10,
    libro_isbn: '978-0307277671',
    persona: 'Jerson',
    fecha_prestamo: new Date(Date.now() - 30 * 86400000).toISOString(),
    libros: {
      titulo: 'Rayuela',
      autores: 'Julio Cortázar',
      thumbnail: 'https://covers.openlibrary.org/b/id/10609658-L.jpg',
    },
  },
]

export default function WelcomeScreen({ userName, onSelectLend, onReturnSuccess }: WelcomeScreenProps) {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(true)
  const [returningIsbn, setReturningIsbn] = useState<string | null>(null)
  const [returnError, setReturnError] = useState<string>('')
  const [confirmReturn, setConfirmReturn] = useState<Prestamo | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: containerRef })

  // Cargar datos (Mezclando reales con mock si falla o está vacío para demo)
  const fetchPrestamos = async () => {
    try {
      const response = await fetch('/api/user-loans')
      if (response.ok) {
        const data = await response.json()
        if (data && data.length > 0) {
          setPrestamos(data)
        } else {
          setPrestamos(MOCK_PRESTAMOS) // Fallback a Mock si no hay datos reales
        }
      } else {
        setPrestamos(MOCK_PRESTAMOS)
      }
    } catch (error) {
      console.error('[WelcomeScreen] Error fetching loans:', error)
      setPrestamos(MOCK_PRESTAMOS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrestamos()
  }, [])

  // Scroll detection
  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsScrolled(latest > 20)
  })

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
        // En demo mode, simulamos éxito
        if (MOCK_PRESTAMOS.find((p) => p.id === confirmReturn.id)) {
          alert('En modo demo: Libro devuelto correctamente')
          setPrestamos((prev) => prev.filter((p) => p.id !== confirmReturn.id))
          return
        }

        // Error real
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
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-md mx-auto overflow-hidden bg-stone-50 relative">
      {/* HEADER UNIFICADO (Título + Resumen) - Sticky */}
      <motion.div
        layout
        className={cn(
          'z-30 w-full bg-stone-50/95 backdrop-blur-md border-b transition-all duration-300',
          isScrolled ? 'border-violet-100 shadow-sm' : 'border-transparent'
        )}
      >
        <div className="px-6 py-4 flex flex-col items-center text-center">
          <motion.h1
            layout
            className={cn(
              'font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-600 to-fuchsia-600 leading-none tracking-tighter transition-all duration-300 font-display',
              isScrolled ? 'text-3xl' : 'text-5xl mb-2'
            )}
          >
            LEE(PE)
          </motion.h1>

          <AnimatePresence>
            {!isScrolled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="text-lg font-medium text-slate-500">
                  Hola, <span className="text-violet-600 font-bold">{userName.split(' ')[0]}</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* CONTENIDO SCROLLEABLE */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto w-full no-scrollbar relative"
      >
        <div className="px-4 pb-6 pt-4 space-y-6">
          {/* SECCIÓN 1: ACCIÓN PRINCIPAL (Ahora arriba, antes de los préstamos) */}
          <div className="animate-in zoom-in-95 duration-500 delay-100">
            <button
              type="button"
              onClick={onSelectLend}
              className="group relative w-full overflow-hidden rounded-[2rem] bg-slate-900 p-1 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative bg-slate-900 rounded-[1.8rem] px-6 py-6 flex items-center justify-between border border-white/10">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-2xl font-black text-white tracking-tight">Escanear Libro</span>
                  <span className="text-slate-400 text-xs font-medium">Toca para abrir la cámara</span>
                </div>
                <div className="h-14 w-14 bg-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-violet-600/50 group-hover:rotate-12 transition-transform">
                  <ScanBarcode
                    className="text-white"
                    size={28}
                  />
                </div>
              </div>
            </button>
          </div>

          {/* SECCIÓN 2: PRÉSTAMOS ACTIVOS (Ahora abajo) */}
          <div className="animate-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <BookOpen
                  size={18}
                  className="text-violet-600"
                />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Tus Préstamos</h3>
              </div>
              <span className="bg-violet-100 text-violet-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                {prestamos.length}
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-violet-100">
                <div className="animate-pulse h-2 w-24 bg-slate-200 rounded-full mx-auto" />
              </div>
            ) : prestamos.length > 0 ? (
              <div className="space-y-3">
                {prestamos.map((prestamo) => (
                  <div
                    key={prestamo.id}
                    className="group relative bg-white border border-violet-100/50 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all flex gap-3 overflow-hidden"
                  >
                    <div className="shrink-0 relative w-16 aspect-[2/3] rounded-lg overflow-hidden bg-slate-100 shadow-inner">
                      <img
                        src={prestamo.libros.thumbnail || ''}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 py-1 flex flex-col">
                      <h4 className="font-bold text-slate-800 text-sm leading-tight line-clamp-1">
                        {prestamo.libros.titulo}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1 mb-2">{prestamo.libros.autores}</p>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">
                          <Clock size={10} />
                          <span>
                            {new Date(prestamo.fecha_prestamo).toLocaleDateString('es', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReturnClick(prestamo)}
                          disabled={returningIsbn === prestamo.libro_isbn}
                          className="h-7 px-3 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg ml-2"
                        >
                          Devolver
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
                <p className="text-slate-400 font-medium text-sm">No tienes libros prestados.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Toast & Modals (Igual que antes) */}
      {returnError && (
        <div className="absolute bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-sm shadow-xl flex items-center gap-3">
            <AlertCircle className="shrink-0 text-red-500" />
            <p className="font-medium">{returnError}</p>
          </div>
        </div>
      )}

      <Dialog
        open={!!confirmReturn}
        onOpenChange={(open) => !open && setConfirmReturn(null)}
      >
        <DialogContent className="rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl sm:max-w-md w-full bg-slate-50 gap-0">
          {confirmReturn && (
            <>
              <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 p-8 pt-10 pb-16 text-center text-white">
                <h3 className="text-2xl font-black mb-1">¿Devolver Libro?</h3>
                <p className="text-white/90 text-sm font-medium">Confirma que tienes el libro</p>
              </div>
              <div className="px-6 pb-8 flex flex-col items-center text-center mt-[-3rem]">
                <div className="w-28 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-4 ring-white bg-white mx-auto relative z-10">
                  <img
                    src={confirmReturn.libros.thumbnail || ''}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>
                <div className="mt-4 w-full">
                  <h4 className="font-bold text-lg text-slate-800 line-clamp-1">{confirmReturn.libros.titulo}</h4>
                </div>
              </div>
              <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1 rounded-xl"
                  onClick={() => setConfirmReturn(null)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmReturn}
                  className="flex-1 rounded-xl bg-slate-900 text-white"
                >
                  Sí, devolver
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
