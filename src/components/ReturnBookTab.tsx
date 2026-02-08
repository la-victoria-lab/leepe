'use client'

import IsbnScanner, { IsbnScannerRef } from '@/components/IsbnScanner'
import { useRef, useState } from 'react'

export default function ReturnBookTab() {
  const scannerRef = useRef<IsbnScannerRef>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    libro: { titulo: string; thumbnail: string }
    prestamo: { persona: string; fecha_prestamo: string; fecha_devolucion: string }
  } | null>(null)
  const [error, setError] = useState<string>('')

  const returnByIsbn = async (isbn: string) => {
    if (loading) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/return-book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isbn }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Error al devolver libro')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const returnByImage = async (image: File) => {
    if (loading) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('image', image)

      const response = await fetch('/api/return-book', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Error al devolver libro por imagen')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleCapture = () => {
    setError('')
    setResult(null)
    scannerRef.current?.capture()
  }

  return (
    <div className='flex flex-col gap-5 w-full'>
      <div className='shrink-0'>
        <IsbnScanner
          ref={scannerRef}
          onDetected={(isbn) => returnByIsbn(isbn)}
          onCapture={returnByImage}
          isActive={!loading}
          videoClassName='h-[35dvh] max-h-[350px] min-h-48 rounded-xl'
        />
      </div>

      <button
        type='button'
        onClick={handleCapture}
        disabled={loading}
        className='w-full py-5 rounded-2xl bg-black text-white text-lg font-bold hover:bg-gray-900 active:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 touch-manipulation transition-all active:scale-[0.99] shadow-md'
      >
        {loading ? 'Procesando...' : 'Capturar foto'}
      </button>

      {error && (
        <div className='p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl'>
          {error}
        </div>
      )}

      {result && (
        <div className='border rounded-2xl p-5 bg-white shadow-sm'>
          <h3 className='text-lg font-semibold text-gray-900 mb-3'>Devolución registrada</h3>

          <div className='grid md:grid-cols-[200px_1fr] gap-4'>
            {result.libro.thumbnail && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={result.libro.thumbnail}
                alt={result.libro.titulo}
                className='w-full rounded-xl ring-1 ring-black/10'
              />
            )}

            <div>
              <p className='mb-2'>
                <strong>Libro:</strong> {result.libro.titulo}
              </p>
              <p className='mb-2'>
                <strong>Devuelto por:</strong> {result.prestamo.persona}
              </p>
              <p className='mb-2'>
                <strong>Fecha de préstamo:</strong> {new Date(result.prestamo.fecha_prestamo).toLocaleString('es')}
              </p>
              <p className='mb-2'>
                <strong>Fecha de devolución:</strong> {new Date(result.prestamo.fecha_devolucion).toLocaleString('es')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
