'use client'

import { useEffect, useState } from 'react'

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
    <div className='border rounded-xl p-4 bg-white shadow'>
      <div className='flex items-center justify-between gap-4 mb-3'>
        <h2 className='text-lg font-bold'>Historial de préstamos</h2>
        <button
          type='button'
          onClick={load}
          disabled={isLoading}
          className='px-3 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-200 disabled:text-gray-500 text-sm'
        >
          Recargar
        </button>
      </div>

      {error && (
        <div className='mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm'>
          {error}
        </div>
      )}

      {isLoading && !prestamos.length ? (
        <p className='text-gray-600 text-sm'>Cargando...</p>
      ) : !prestamos.length ? (
        <p className='text-gray-600 text-sm'>Sin préstamos registrados</p>
      ) : (
        <div className='space-y-3 max-h-[60vh] overflow-y-auto'>
          {prestamos.map((prestamo) => (
            <div
              key={prestamo.id}
              className='border rounded-lg p-3 bg-gray-50 flex gap-3'
            >
              {prestamo.libros.thumbnail && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={prestamo.libros.thumbnail}
                  alt={prestamo.libros.titulo}
                  className='w-16 h-24 object-cover rounded-lg ring-1 ring-black/10 shrink-0'
                />
              )}
              <div className='flex-1 min-w-0'>
                <p className='font-medium text-gray-900 truncate'>{prestamo.libros.titulo}</p>
                {prestamo.libros.autores && (
                  <p className='text-sm text-gray-600 truncate'>{prestamo.libros.autores}</p>
                )}
                <p className='text-sm text-gray-700 mt-1'>
                  <span className={prestamo.devuelto ? 'text-green-600' : 'text-orange-600'}>
                    {prestamo.devuelto ? '✓ Devuelto' : '● Prestado'}
                  </span>
                  {' - '}
                  {prestamo.persona}
                </p>
                <p className='text-xs text-gray-500 mt-1'>
                  Prestado: {new Date(prestamo.fecha_prestamo).toLocaleString('es')}
                </p>
                {prestamo.fecha_devolucion && (
                  <p className='text-xs text-gray-500'>
                    Devuelto: {new Date(prestamo.fecha_devolucion).toLocaleString('es')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

