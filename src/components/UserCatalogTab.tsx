'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, BookOpen, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LOAN_CONFIG } from '@/lib/loan-config'

type Libro = {
  isbn: string
  titulo: string
  autores: string[] | null
  thumbnail: string | null
  copias_total: number
  copias_disponibles: number
  disponible: boolean
}

type UserCatalogTabProps = {
  onBorrow?: () => void
}

export default function UserCatalogTab({ onBorrow }: UserCatalogTabProps) {
  const [libros, setLibros] = useState<Libro[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [borrowingIsbn, setBorrowingIsbn] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const fetchLibros = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/user/catalog?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setLibros(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => fetchLibros(search), 300)
    return () => clearTimeout(timeout)
  }, [search, fetchLibros])

  const handleBorrow = async (isbn: string) => {
    if (borrowingIsbn) return
    setBorrowingIsbn(isbn)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await fetch('/api/lend-book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isbn }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al prestar')

      setSuccessMsg(`¡Prestado! Devuélvelo en ${LOAN_CONFIG.INITIAL_DAYS} días`)
      setTimeout(() => setSuccessMsg(''), 4000)
      await fetchLibros(search)
      onBorrow?.()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al prestar')
      setTimeout(() => setErrorMsg(''), 4000)
    } finally {
      setBorrowingIsbn(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Buscador */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por título o autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 shadow-sm"
          />
        </div>
      </div>

      {/* Toast */}
      {(successMsg || errorMsg) && (
        <div className={`mx-4 mb-3 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
          successMsg ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {successMsg ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {successMsg || errorMsg}
        </div>
      )}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : libros.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin resultados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {libros.map((libro) => (
              <div
                key={libro.isbn}
                className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex gap-3 items-center"
              >
                {/* Portada */}
                <div className="w-12 aspect-[2/3] rounded-lg overflow-hidden bg-slate-100 shrink-0 shadow-sm">
                  {libro.thumbnail ? (
                    <img src={libro.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={16} className="text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 line-clamp-1">{libro.titulo}</p>
                  <p className="text-xs text-slate-400 line-clamp-1 mb-1.5">
                    {Array.isArray(libro.autores) ? libro.autores.join(', ') : libro.autores || '—'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      libro.disponible
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-red-50 text-red-500'
                    }`}>
                      {libro.disponible
                        ? `${libro.copias_disponibles}/${libro.copias_total} disponible${libro.copias_disponibles !== 1 ? 's' : ''}`
                        : 'No disponible'}
                    </span>
                    {libro.disponible && (
                      <Button
                        size="sm"
                        onClick={() => handleBorrow(libro.isbn)}
                        disabled={borrowingIsbn === libro.isbn}
                        className="h-7 px-3 text-[10px] font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
                      >
                        {borrowingIsbn === libro.isbn ? '...' : 'Pedir'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
