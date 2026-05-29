'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Clock, Loader2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LOAN_CONFIG, daysUntilDue, getLoanStatus } from '@/lib/loan-config'

interface Prestamo {
  id: string
  libro_isbn: string
  libro_titulo: string
  libro_autores: string[] | null
  libro_thumbnail: string | null
  fecha_prestamo: string
  fecha_limite: string
  devuelto: boolean
  fecha_devolucion?: string
  renewal_count: number
}

interface LoanHistoryTabsProps {
  onRenew?: (prestamoId: string) => void
  renewingId?: string | null
}

export default function LoanHistoryTabs({ onRenew, renewingId }: LoanHistoryTabsProps) {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'activos' | 'devueltos'>('activos')

  useEffect(() => {
    const fetchPrestamos = async () => {
      try {
        const res = await fetch('/api/user/prestamos')
        const data = await res.json()
        setPrestamos(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error fetching prestamos:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPrestamos()
  }, [])

  const prestamoActivos = prestamos.filter((p) => !p.devuelto)
  const prestamoDevueltos = prestamos.filter((p) => p.devuelto)

  const TabContent = ({ items, isActive }: { items: Prestamo[]; isActive: boolean }) => {
    if (!isActive) return null

    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-slate-400">
          <BookOpen size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            {activeTab === 'activos'
              ? 'No tienes libros activos'
              : 'No tienes historial de devoluciones'}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {items.map((prestamo) => {
          const daysLeft = daysUntilDue(new Date(prestamo.fecha_limite))
          const status = getLoanStatus(new Date(prestamo.fecha_limite))
          const statusColor =
            status === 'vigente'
              ? daysLeft > 7
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : 'bg-red-50 border-red-200 text-red-700'

          return (
            <div
              key={prestamo.id}
              className={`border rounded-2xl p-4 flex gap-3 items-start ${statusColor}`}
            >
              {/* Portada */}
              <div className="w-12 aspect-[2/3] rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                {prestamo.libro_thumbnail ? (
                  <img
                    src={prestamo.libro_thumbnail}
                    alt={prestamo.libro_titulo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={16} className="text-slate-300" />
                  </div>
                )}
              </div>

              {/* Información */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm line-clamp-1">{prestamo.libro_titulo}</h3>
                <p className="text-xs opacity-75 line-clamp-1 mb-2">
                  {Array.isArray(prestamo.libro_autores)
                    ? prestamo.libro_autores.join(', ')
                    : prestamo.libro_autores || '—'}
                </p>

                {/* Fechas */}
                {!prestamo.devuelto ? (
                  <div className="text-xs opacity-75">
                    <p>
                      Vence en{' '}
                      <span className="font-bold">
                        {daysLeft} {daysLeft === 1 ? 'día' : 'días'}
                      </span>
                    </p>
                    <p className="text-[10px]">
                      Renovaciones: {prestamo.renewal_count}/{LOAN_CONFIG.MAX_RENEWALS}
                    </p>
                  </div>
                ) : (
                  <div className="text-xs opacity-75">
                    <p>Devuelto: {new Date(prestamo.fecha_devolucion || '').toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {/* Botón renovar */}
              {!prestamo.devuelto && prestamo.renewal_count < LOAN_CONFIG.MAX_RENEWALS && (
                <Button
                  size="sm"
                  onClick={() => onRenew?.(prestamo.id)}
                  disabled={renewingId === prestamo.id}
                  className="flex-shrink-0 rounded-lg text-xs h-8"
                >
                  {renewingId === prestamo.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    `+${LOAN_CONFIG.RENEWAL_DAYS}d`
                  )}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-violet-600" size={32} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
        <Button
          variant={activeTab === 'activos' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('activos')}
          size="sm"
          className="flex-1 rounded-xl text-sm"
        >
          <Clock size={14} className="mr-1" />
          Activos ({prestamoActivos.length})
        </Button>
        <Button
          variant={activeTab === 'devueltos' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('devueltos')}
          size="sm"
          className="flex-1 rounded-xl text-sm"
        >
          <CheckCircle size={14} className="mr-1" />
          Devueltos ({prestamoDevueltos.length})
        </Button>
      </div>

      {/* Contenido */}
      <TabContent items={prestamoActivos} isActive={activeTab === 'activos'} />
      <TabContent items={prestamoDevueltos} isActive={activeTab === 'devueltos'} />
    </div>
  )
}
