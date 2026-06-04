'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PendingLoan {
  id: string
  persona: string
  libro_titulo: string
  libro_autores: string | null
  libro_thumbnail: string | null
  fecha_prestamo: string
  fecha_limite: string
  fecha_devuelto: string
  rating: number | null
  comentario: string | null
  status: string
}

export default function VerifyLoansTab() {
  const [loans, setLoans] = useState<PendingLoan[]>([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingLoans()
  }, [])

  const fetchPendingLoans = async () => {
    try {
      const res = await fetch('/api/admin/verify-loans')
      if (!res.ok) throw new Error('Error fetching loans')
      const data = await res.json()
      setLoans(data.loans || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (loanId: string) => {
    setVerifying(loanId)
    try {
      const res = await fetch(`/api/admin/verify-loan/${loanId}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Error verifying loan')

      // Remover del listado
      setLoans(loans.filter(l => l.id !== loanId))
    } catch (error) {
      console.error('Error:', error)
      alert('Error al verificar préstamo')
    } finally {
      setVerifying(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-violet-600" size={32} />
      </div>
    )
  }

  if (loans.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Check size={40} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">No hay devoluciones pendientes de verificación</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Verificar Devoluciones</h2>
        <p className="text-sm text-slate-500 mt-1">
          {loans.length} {loans.length === 1 ? 'devolución' : 'devoluciones'} pendientes de verificación física
        </p>
      </div>

      <div className="space-y-3">
        {loans.map((loan) => (
          <div
            key={loan.id}
            className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all"
          >
            <div className="flex gap-4">
              {/* Portada */}
              <div className="w-16 h-24 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                {loan.libro_thumbnail ? (
                  <img src={loan.libro_thumbnail} alt={loan.libro_titulo} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">📚</div>
                )}
              </div>

              {/* Información */}
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 line-clamp-1">{loan.libro_titulo}</h3>
                <p className="text-xs text-slate-500 mb-2">
                  {Array.isArray(loan.libro_autores)
                    ? loan.libro_autores.join(', ')
                    : loan.libro_autores || '—'}
                </p>

                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div>
                    <p className="text-slate-500">Usuario</p>
                    <p className="font-semibold text-slate-700">{loan.persona}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Devuelto</p>
                    <p className="font-semibold text-slate-700">
                      {new Date(loan.fecha_devuelto).toLocaleDateString('es')}
                    </p>
                  </div>
                </div>

                {/* Rating */}
                {loan.rating !== null && (
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={12}
                        className={
                          star <= (loan.rating || 0)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }
                      />
                    ))}
                    <span className="text-xs text-slate-600 ml-1">{loan.rating || 0}/5</span>
                    {loan.comentario && (
                      <span className="text-xs text-slate-500 ml-2 italic">&quot;{loan.comentario}&quot;</span>
                    )}
                  </div>
                )}
              </div>

              {/* Botón Verificar */}
              <div className="flex items-center">
                <Button
                  onClick={() => handleVerify(loan.id)}
                  disabled={verifying === loan.id}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  {verifying === loan.id ? (
                    <>
                      <Loader2 size={14} className="animate-spin mr-2" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Check size={14} className="mr-2" />
                      Verificar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
