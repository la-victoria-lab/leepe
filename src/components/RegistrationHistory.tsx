'use client'

import { useEffect, useState } from 'react'

type RegistrationItem = {
  isbn: string
  titulo: string
  created_at: string | null
}

export default function RegistrationHistory() {
  const [items, setItems] = useState<RegistrationItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async (cursor?: string) => {
    if (isLoading) return
    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (cursor) params.set('cursor', cursor)

      const response = await fetch(`/api/admin/registration-history?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'failed to load')
      }

      const newItems = (data?.items || []) as RegistrationItem[]
      setItems((prev) => (cursor ? [...prev, ...newItems] : newItems))
      setNextCursor(data?.nextCursor || null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="border rounded-xl p-4 bg-white shadow">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 className="text-lg font-bold">Historial de registro</h2>
        <button
          type="button"
          onClick={() => load()}
          disabled={isLoading}
          className="px-3 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-200 disabled:text-gray-500 text-sm"
        >
          Recargar
        </button>
      </div>

      {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {!items.length && !isLoading ? (
        <p className="text-gray-600 text-sm">Sin registros</p>
      ) : (
        <ul className="space-y-2">
          {items.map((book) => (
            <li
              key={`${book.isbn}-${book.created_at || ''}`}
              className="text-sm flex items-baseline justify-between gap-4"
            >
              <span className="text-gray-900">{book.titulo}</span>
              <span className="text-gray-500">
                {book.created_at ? new Date(book.created_at).toLocaleString('es') : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => (nextCursor ? load(nextCursor) : null)}
          disabled={!nextCursor || isLoading}
          className="w-full px-5 py-3 rounded-lg bg-black text-white font-semibold disabled:bg-gray-400"
        >
          {isLoading ? 'Cargando...' : nextCursor ? 'Cargar más' : 'No hay más'}
        </button>
      </div>
    </div>
  )
}
