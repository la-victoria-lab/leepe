'use client'

import IsbnScanner, { IsbnScannerRef } from '@/components/IsbnScanner'
import { useRef, useState } from 'react'

type LendBookTabProps = {
  onSuccess?: () => void
}

export default function LendBookTab({ onSuccess }: LendBookTabProps) {
  const scannerRef = useRef<IsbnScannerRef>(null)
  const [loading, setLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(true)
  const [canUseBarcode, setCanUseBarcode] = useState(true)
  const [result, setResult] = useState<{
    libro: { titulo: string; thumbnail: string }
    prestamo: { persona: string; fecha_prestamo: string }
  } | null>(null)
  const [error, setError] = useState<string>('')

  const lendByIsbn = async (isbn: string) => {
    if (loading || !isScanning) return

    setIsScanning(false)
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/lend-book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isbn }),
      })

      if (!response.ok) {
        let errorMessage = 'Error al prestar libro'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = response.statusText || `Error ${response.status}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setIsScanning(true)
    } finally {
      setLoading(false)
    }
  }

  const lendByImage = async (image: File) => {
    if (loading || !isScanning) return

    setIsScanning(false)
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('image', image)

      const response = await fetch('/api/lend-book', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = 'Error al prestar libro por imagen'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = response.statusText || `Error ${response.status}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setIsScanning(true)
    } finally {
      setLoading(false)
    }
  }

  const handleCapture = () => {
    setError('')
    setResult(null)
    scannerRef.current?.capture()
  }



  const handleOk = () => {
    setResult(null)
    setError('')
    setIsScanning(true)
    if (onSuccess) {
      onSuccess()
    }
  }

  if (result) {
    return (
      <div className='flex flex-col gap-5 w-full'>
        <div className='border rounded-2xl p-5 bg-white shadow-sm'>
          <h3 className='text-lg font-semibold text-gray-900 mb-3'>Préstamo registrado</h3>

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
                <strong>Prestado a:</strong> {result.prestamo.persona}
              </p>
              <p className='mb-2'>
                <strong>Fecha:</strong> {new Date(result.prestamo.fecha_prestamo).toLocaleString('es')}
              </p>
            </div>
          </div>
        </div>

        <button
          type='button'
          onClick={handleOk}
          className='w-full py-5 rounded-2xl bg-black text-white text-lg font-bold hover:bg-gray-900 active:bg-gray-800 touch-manipulation transition-all active:scale-[0.99] shadow-md'
        >
          OK
        </button>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-5 w-full'>
      <div className='shrink-0'>
        <IsbnScanner
          ref={scannerRef}
          onDetected={(isbn) => lendByIsbn(isbn)}
          onCapture={lendByImage}
          onBarcodeSupportChange={setCanUseBarcode}
          isActive={isScanning && !loading}
          videoClassName='h-[35dvh] max-h-[350px] min-h-48 rounded-xl'
        />
      </div>

      {!canUseBarcode && (
        <button
          type='button'
          onClick={handleCapture}
          disabled={loading || !isScanning}
          className='w-full py-5 rounded-2xl bg-black text-white text-lg font-bold hover:bg-gray-900 active:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 touch-manipulation transition-all active:scale-[0.99] shadow-md'
        >
          {loading ? 'Procesando...' : 'Escanear Código'}
        </button>
      )}

      {error && (
        <div className='p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl'>
          {error}
          <button
            type='button'
            onClick={() => {
              setError('')
              setIsScanning(true)
            }}
            className='mt-2 w-full py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 active:bg-red-800 touch-manipulation transition-all'
          >
            Reintentar
          </button>
        </div>
      )}

      {loading && (
        <div className='p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl text-center'>
          Procesando...
        </div>
      )}
    </div>
  )
}
