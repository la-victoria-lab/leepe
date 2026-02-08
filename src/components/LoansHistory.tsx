'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle2, Clock, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Prestamo = {
  id: number
  libro_isbn: string
  persona: string
  fecha_prestamo: string
  fecha_devolucion: string | null
  devuelto: boolean
  libros: {
    titulo: string
    autores: string | null
    thumbnail: string | null
  }
}

export default function LoansHistory() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (isLoading) return
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/loans-history')
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data?.error || 'Error al cargar historial')
      }

      const data = await response.json()
      setPrestamos(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col h-full pt-4 md:pt-0">
      {/* Action Bar (Aligned with other views) */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight hidden md:block">Historial de Préstamos</h2>
        <Button
          onClick={load}
          variant="outline"
          disabled={isLoading}
          size="icon"
          className="rounded-full h-10 w-10 ml-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 block" />
          {error}
        </div>
      )}

      {isLoading && !prestamos.length ? (
        <div className="flex-1 flex items-center justify-center p-10">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
            <p className="font-medium text-sm">Cargando historial...</p>
          </div>
        </div>
      ) : !prestamos.length ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
          <div className="bg-slate-100 p-6 rounded-full mb-4">
            <Clock
              size={40}
              className="text-slate-300"
            />
          </div>
          <p className="text-slate-400 font-medium">No hay historial de préstamos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
          {prestamos.map((prestamo) => (
            <div
              key={prestamo.id}
              className="group bg-white rounded-[1.5rem] p-4 shadow-sm hover:shadow-md transition-all border border-stone-100 flex gap-4"
            >
              {/* Cover */}
              <div className="w-16 aspect-[2/3] rounded-xl overflow-hidden shadow-sm bg-stone-100 shrink-0 relative group-hover:scale-105 transition-transform">
                {prestamo.libros.thumbnail ? (
                  <img
                    src={prestamo.libros.thumbnail}
                    alt={prestamo.libros.titulo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <BookOpen size={20} />
                  </div>
                )}
                {/* Status Badge Over Cover */}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-1 ${prestamo.devuelto ? 'bg-green-500' : 'bg-orange-500'}`}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="font-bold text-slate-900 leading-tight mb-1 line-clamp-2">{prestamo.libros.titulo}</h4>
                <p className="text-xs font-semibold text-slate-500 mb-2 truncate">{prestamo.persona}</p>

                <div className="flex items-center gap-2 mt-auto">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      prestamo.devuelto ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                    }`}
                  >
                    {prestamo.devuelto ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                    {prestamo.devuelto ? 'Devuelto' : 'Prestado'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(prestamo.fecha_prestamo).toLocaleDateString('es', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
