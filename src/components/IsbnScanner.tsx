'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException, BarcodeFormat } from '@zxing/library'
import { isbnLogger } from '@/lib/logger'

export type IsbnScannerRef = {
  capture: () => void
  canUseBarcodeDetector: boolean
}

type IsbnScannerProps = {
  onDetected: (isbn: string) => void
  onCapture?: (file: File) => void
  onBarcodeSupportChange?: (supported: boolean) => void
  isActive?: boolean
  containerClassName?: string
  videoClassName?: string
  sessionId?: number
}

// Timeout para fallback automático a OpenAI (5 segundos)
const AUTO_FALLBACK_TIMEOUT = 5000

const IsbnScanner = forwardRef<IsbnScannerRef, IsbnScannerProps>(
  (
    {
      onDetected,
      onCapture,
      onBarcodeSupportChange,
      isActive = true,
      containerClassName,
      videoClassName,
      sessionId,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const readerRef = useRef<BrowserMultiFormatReader | null>(null)

    const [error, setError] = useState<string>('')
    const [isReady, setIsReady] = useState(false)
    const [isFallingBackToOpenAI, setIsFallingBackToOpenAI] = useState(false)

    useImperativeHandle(ref, () => ({
      capture: () => {
        if (!videoRef.current || !onCapture) return

        const video = videoRef.current
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(video, 0, 0)

        canvas.toBlob(
          (blob) => {
            if (!blob) return
            const file = new File([blob], 'snapshot.jpg', { type: 'image/jpeg' })
            onCapture(file)
          },
          'image/jpeg',
          0.85
        )
      },
      canUseBarcodeDetector: true, // ZXing funciona en todos los navegadores
    }))

    useEffect(() => {
      // ZXing funciona en todos los navegadores modernos
      if (onBarcodeSupportChange) {
        onBarcodeSupportChange(true)
      }
    }, [onBarcodeSupportChange])

    useEffect(() => {
      if (!isActive) return

      let cancelled = false
      let manualCaptureTimer: NodeJS.Timeout | null = null

      const start = async () => {
        setError('')
        setIsReady(false)
        setIsFallingBackToOpenAI(false)

        try {
          // Solicitar acceso a la cámara
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          })

          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }

          streamRef.current = stream
          const video = videoRef.current
          if (!video) return

          video.srcObject = stream
          await video.play()
          setIsReady(true)

          // Inicializar ZXing reader
          const reader = new BrowserMultiFormatReader()
          readerRef.current = reader

          // Configurar formatos de código de barras para ISBNs
          const hints = new Map()
          hints.set(
            2, // DecodeHintType.POSSIBLE_FORMATS
            [
              BarcodeFormat.EAN_13,
              BarcodeFormat.EAN_8,
              BarcodeFormat.CODE_128,
              BarcodeFormat.CODE_39,
              BarcodeFormat.UPC_A,
              BarcodeFormat.UPC_E,
            ]
          )

          // Iniciar detección continua
          reader.decodeFromVideoDevice(
            null, // deviceId (null = usar cámara por defecto)
            video,
            (result, error) => {
              if (cancelled) return

              if (result) {
                const isbn = result.getText().trim()
                if (isbn) {
                  // ISBN detectado exitosamente con ZXing (GRATIS)
                  isbnLogger.info({ isbn, method: 'zxing' }, 'ISBN detected successfully with ZXing')
                  onDetected(isbn)
                  // Cancelar el timer de captura manual
                  if (manualCaptureTimer) {
                    clearTimeout(manualCaptureTimer)
                    manualCaptureTimer = null
                  }
                }
              }

              // Errores de NotFoundException son normales (no hay código en el frame)
              if (error && !(error instanceof NotFoundException)) {
                isbnLogger.error({ err: error }, 'ZXing scanning error')
              }
            }
          )

          // Después de 5 segundos sin detectar nada, automáticamente capturar y enviar a OpenAI
          manualCaptureTimer = setTimeout(() => {
            if (!cancelled && onCapture) {
              isbnLogger.warn('ZXing could not detect barcode after 5s, auto-capturing for OpenAI')
              setIsFallingBackToOpenAI(true)

              // Auto-capturar y enviar a OpenAI (transparente)
              setTimeout(() => {
                if (!cancelled && videoRef.current) {
                  const video = videoRef.current
                  const canvas = document.createElement('canvas')
                  canvas.width = video.videoWidth
                  canvas.height = video.videoHeight

                  const ctx = canvas.getContext('2d')
                  if (!ctx) return

                  ctx.drawImage(video, 0, 0)

                  canvas.toBlob(
                    (blob) => {
                      if (!blob || cancelled) return
                      const file = new File([blob], 'auto-capture.jpg', { type: 'image/jpeg' })
                      isbnLogger.info('Auto-captured image for OpenAI fallback')
                      onCapture(file)
                    },
                    'image/jpeg',
                    0.85
                  )
                }
              }, 500) // Pequeño delay para mostrar el indicador visual
            }
          }, AUTO_FALLBACK_TIMEOUT)
        } catch (error) {
          isbnLogger.error({ err: error }, 'Camera access error')
          setError('No se pudo acceder a la cámara')
        }
      }

      start()

      return () => {
        cancelled = true

        // Limpiar timer
        if (manualCaptureTimer) {
          clearTimeout(manualCaptureTimer)
        }

        // Detener ZXing reader
        if (readerRef.current) {
          readerRef.current.reset()
          readerRef.current = null
        }

        // Detener stream de video
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }
      }
    }, [isActive, onDetected, sessionId])

    const containerClasses = [
      'relative overflow-hidden rounded-2xl bg-black ring-1 ring-black/10 shadow-sm',
      containerClassName || '',
    ]
      .join(' ')
      .trim()

    const videoClasses = [
      'w-full object-cover',
      videoClassName || 'h-[42dvh] max-h-[420px] min-h-64',
    ]
      .filter(Boolean)
      .join(' ')
      .trim()

    return (
      <div className="flex flex-col gap-2">
        <div className={containerClasses}>
          <div className="relative">
            <video
              ref={videoRef}
              className={videoClasses}
              playsInline
              muted
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 grid place-items-center">
                <div className="w-56 h-36 rounded-xl ring-2 ring-white/70" />
              </div>
            </div>

            {/* Indicador de estado */}
            {isReady && !isFallingBackToOpenAI && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-500/90 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Buscando código de barras...
              </div>
            )}

            {/* Indicador de fallback a OpenAI */}
            {isFallingBackToOpenAI && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-purple-500/90 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                🤖 Analizando con IA...
              </div>
            )}
          </div>
        </div>

        <div className="px-1 min-h-[1.5em]">
          {!isReady && !error && isActive && (
            <p className="text-sm text-gray-500 text-center animate-pulse">Iniciando cámara...</p>
          )}
          {error && <p className="text-sm text-red-600 text-center font-medium">{error}</p>}
          {isReady && !error && !isFallingBackToOpenAI && (
            <p className="text-sm text-gray-500 text-center">
              🎯 <strong>ZXing</strong> · Escaneo gratis · Fallback IA automático en 5s
            </p>
          )}
          {isFallingBackToOpenAI && (
            <p className="text-sm text-purple-600 text-center font-medium">
              🤖 Usando OpenAI para detectar ISBN...
            </p>
          )}
        </div>
      </div>
    )
  }
)

IsbnScanner.displayName = 'IsbnScanner'

export default IsbnScanner
