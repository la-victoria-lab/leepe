'use client'

import IsbnScanner, { IsbnScannerRef } from '@/components/IsbnScanner'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, ScanLine, Camera, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  // Success View
  if (result) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500">
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-50 animate-pulse" />
          <CheckCircle2
            size={80}
            className="text-green-500 relative z-10"
          />
        </div>

        <h3 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">¡Disfruta tu lectura!</h3>
        <p className="text-slate-500 font-medium mb-8">Préstamo registrado exitosamente</p>

        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 w-full mb-8 transform rotate-1 hover:rotate-0 transition-transform duration-300">
          <div className="flex gap-4 items-start text-left">
            {result.libro.thumbnail && (
              <div className="w-20 aspect-[2/3] rounded-lg overflow-hidden shadow-md shrink-0 bg-slate-100">
                <img
                  src={result.libro.thumbnail}
                  alt={result.libro.titulo}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              <h4 className="font-bold text-lg text-slate-900 leading-tight mb-1">{result.libro.titulo}</h4>
              <p className="text-sm text-slate-500 font-medium line-clamp-2">Prestado a {result.prestamo.persona}</p>
              <p className="text-xs text-slate-400 mt-2 font-mono bg-slate-50 inline-block px-2 py-1 rounded-md">
                {new Date(result.prestamo.fecha_prestamo).toLocaleTimeString('es', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleOk}
          className="w-full h-14 rounded-2xl bg-slate-900 text-white text-lg font-bold shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Volver al Inicio
        </Button>
      </div>
    )
  }

  // Error View
  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center animate-in zoom-in-95 duration-300">
        <div className="mb-6 bg-red-100 p-6 rounded-full">
          <XCircle
            size={64}
            className="text-red-500"
          />
        </div>

        <h3 className="text-2xl font-black text-slate-800 mb-2">Algo salió mal</h3>
        <p className="text-slate-500 font-medium mb-8 max-w-xs mx-auto">{error}</p>

        <div className="flex flex-col gap-3 w-full">
          <Button
            onClick={() => {
              setError('')
              setIsScanning(true)
              setLoading(false)
            }}
            className="w-full h-14 rounded-2xl bg-slate-900 text-white text-lg font-bold"
          >
            Intentar de nuevo
          </Button>
          <Button
            variant="ghost"
            onClick={onSuccess}
            className="text-slate-400 font-bold"
          >
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">
      {/* Scanner Container */}
      <div className="flex-1 relative w-full h-full">
        <IsbnScanner
          ref={scannerRef}
          onDetected={(isbn) => lendByIsbn(isbn)}
          onCapture={lendByImage}
          onBarcodeSupportChange={setCanUseBarcode}
          isActive={isScanning && !loading}
          videoClassName="absolute inset-0 w-full h-full object-cover"
        />

        {/* Overlay UI */}
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
          <div className="flex justify-between items-start pointer-events-auto">
            <Button
              size="icon"
              className="bg-black/40 text-white hover:bg-black/60 backdrop-blur-md rounded-full h-12 w-12"
              onClick={onSuccess}
            >
              <XCircle size={24} />
            </Button>
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white font-medium text-sm shadow-lg">
              Escanee el código de barras
            </div>
            <div className="w-12" /> {/* Spacer for centering */}
          </div>

          {/* Scanning Frame */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-2 border-white/50 rounded-3xl overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,1)] animate-[scan_2s_ease-in-out_infinite]" />
            <div className="absolute top-2 left-2 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl-lg" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr-lg" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl-lg" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-4 border-r-4 border-white rounded-br-lg" />
          </div>

          {/* Bottom Controls Area */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center justify-end pb-8 pointer-events-auto gap-4">
            {loading ? (
              <div className="bg-white/90 backdrop-blur text-slate-900 px-6 py-3 rounded-full font-bold shadow-lg animate-pulse flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-900 rounded-full animate-bounce" />
                Procesando...
              </div>
            ) : !canUseBarcode ? (
              <Button
                onClick={handleCapture}
                className="h-16 px-8 rounded-full bg-white text-slate-900 font-bold text-lg shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Camera className="text-violet-600" />
                Tomar Foto
              </Button>
            ) : (
              <p className="text-white/70 text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
                Apunta la cámara al código ISBN
              </p>
            )}

            <Button
              variant="ghost"
              className="text-white/60 hover:text-white hover:bg-white/10"
              onClick={onSuccess}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>

      <style
        jsx
        global
      >{`
        @keyframes scan {
          0% {
            top: 0%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
