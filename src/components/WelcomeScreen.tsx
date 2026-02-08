'use client'

import { useEffect, useState } from 'react'

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
    <div className="flex flex-col flex-1 min-h-0 py-4 overflow-hidden">
      <div className="text-center mb-4 shrink-0">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">LEE:PE</h1>
        <p className="text-sm text-gray-500">Hola, {userName}</p>
      </div>

      <div className="w-full max-w-md mx-auto px-4 mb-4 shrink-0">
        <button
          type="button"
          onClick={onSelectLend}
          className="w-full py-6 rounded-2xl bg-green-500 text-white text-xl font-bold hover:bg-green-600 active:bg-green-700 transition-transform active:scale-[0.98] shadow-sm touch-manipulation"
        >
          Prestar libro
        </button>
      </div>

      {prestamos.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 px-4 shrink-0">Libros prestados:</h3>
          <div className="overflow-y-auto flex-1 min-h-0 px-4 space-y-3">
            {prestamos.map((prestamo) => (
              <div
                key={prestamo.id}
                className="border rounded-xl p-4 bg-white shadow-sm flex gap-3 shrink-0"
              >
                {prestamo.libros.thumbnail && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={prestamo.libros.thumbnail}
                    alt={prestamo.libros.titulo}
                    className="w-16 h-24 object-cover rounded-lg ring-1 ring-black/10 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0 flex flex-col">
                  <p className="font-medium text-gray-900 truncate">{prestamo.libros.titulo}</p>
                  {prestamo.libros.autores && (
                    <p className="text-sm text-gray-600 truncate">{prestamo.libros.autores}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(prestamo.fecha_prestamo).toLocaleDateString('es')}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleReturnClick(prestamo)}
                    disabled={returningIsbn === prestamo.libro_isbn}
                    className="mt-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 active:bg-orange-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors touch-manipulation self-start"
                  >
                    {returningIsbn === prestamo.libro_isbn ? 'Devolviendo...' : 'Devolver'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {returnError && (
        <div className="px-4 mb-4 shrink-0">
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">{returnError}</div>
        </div>
      )}

      {loading && prestamos.length === 0 && (
        <div className="text-center text-sm text-gray-500 mb-4 shrink-0">Cargando...</div>
      )}

      {confirmReturn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Confirmar devolución</h3>

            <div className="flex gap-4 mb-6">
              {confirmReturn.libros.thumbnail && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={confirmReturn.libros.thumbnail}
                  alt={confirmReturn.libros.titulo}
                  className="w-20 h-32 object-cover rounded-lg ring-1 ring-black/10 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 mb-1">{confirmReturn.libros.titulo}</p>
                {confirmReturn.libros.autores && (
                  <p className="text-sm text-gray-600 mb-2">{confirmReturn.libros.autores}</p>
                )}
                <p className="text-xs text-gray-500">
                  Prestado el: {new Date(confirmReturn.fecha_prestamo).toLocaleDateString('es')}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmReturn(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={returningIsbn !== null}
                className="flex-1 px-4 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 active:bg-orange-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors touch-manipulation"
              >
                {returningIsbn ? 'Devolviendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
