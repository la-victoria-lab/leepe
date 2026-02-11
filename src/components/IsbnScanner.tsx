'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  BrowserMultiFormatReader,
  NotFoundException,
  HTMLCanvasElementLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library'
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

function captureFrame(video: HTMLVideoElement): Promise<File | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return resolve(null)
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return resolve(null)
        resolve(new File([blob], 'capture.jpg', { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.85
    )
  })
}

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
      capture: async () => {
        if (!videoRef.current || !onCapture) return
        const file = await captureFrame(videoRef.current)
        if (file) onCapture(file)
      },
      canUseBarcodeDetector: true,
    }))

    useEffect(() => {
      if (onBarcodeSupportChange) {
        onBarcodeSupportChange(true)
      }
    }, [onBarcodeSupportChange])

    useEffect(() => {
      if (!isActive) return

      let cancelled = false
      let fallbackTimer: NodeJS.Timeout | null = null
      let hasDetectedBarcode = false
      let decodingInterval: NodeJS.Timeout | null = null

      const start = async () => {
        setError('')
        setIsReady(false)
        setIsFallingBackToOpenAI(false)
        hasDetectedBarcode = false

        try {
          const video = videoRef.current
          if (!video) throw new Error('Video element not found')

          if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Tu navegador no soporta acceso a cámara')
          }

          isbnLogger.info('Requesting camera access...')

          // Paso 1: Obtener stream manualmente (como el test que funciona)
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
          isbnLogger.info('Camera access granted')

          // Paso 2: Asignar stream al video (exactamente como el test)
          video.srcObject = stream

          // Paso 3: Esperar a que el video esté reproduciendo
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Video playback timeout')), 5000)

            video.onloadedmetadata = () => {
              video.play()
                .then(() => {
                  clearTimeout(timeout)
                  isbnLogger.info({
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight,
                  }, 'Video is playing')
                  resolve()
                })
                .catch((err) => {
                  clearTimeout(timeout)
                  reject(err)
                })
            }
          })

          if (cancelled) return

          setIsReady(true)

          // Paso 4: Usar ZXing para decodificar frames del video ya reproduciendo
          const reader = new BrowserMultiFormatReader()
          readerRef.current = reader

          isbnLogger.info('Starting ZXing barcode scanning on live video...')

          // Escanear frames periódicamente usando decodeFromCanvas
          const scanFrame = () => {
            if (cancelled || hasDetectedBarcode || !video.videoWidth) return

            try {
              const canvas = document.createElement('canvas')
              canvas.width = video.videoWidth
              canvas.height = video.videoHeight
              const ctx = canvas.getContext('2d')
              if (!ctx) return
              ctx.drawImage(video, 0, 0)

              const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas)
              const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource))
              const result = reader.decodeBitmap(binaryBitmap)

              if (result) {
                const isbn = result.getText().trim()
                if (isbn) {
                  hasDetectedBarcode = true
                  isbnLogger.info({ isbn, method: 'zxing' }, 'ISBN detected with ZXing')
                  if (fallbackTimer) {
                    clearTimeout(fallbackTimer)
                    fallbackTimer = null
                  }
                  onDetected(isbn)
                }
              }
            } catch (e) {
              // NotFoundException es normal (no hay código en el frame)
              if (!(e instanceof NotFoundException)) {
                isbnLogger.warn({ err: e }, 'ZXing scan error (non-critical)')
              }
            }
          }

          // Escanear cada 250ms
          decodingInterval = setInterval(scanFrame, 250)

          // Paso 5: Fallback automático a OpenAI después de 5 segundos
          fallbackTimer = setTimeout(async () => {
            if (cancelled || hasDetectedBarcode || !onCapture) return
            isbnLogger.warn('ZXing could not detect barcode after 5s, auto-capturing for OpenAI')
            setIsFallingBackToOpenAI(true)

            const file = await captureFrame(video)
            if (file && !cancelled) {
              isbnLogger.info('Auto-captured image for OpenAI fallback')
              onCapture(file)
            }
          }, AUTO_FALLBACK_TIMEOUT)

        } catch (err) {
          if (cancelled) return
          const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
          const errorName = err instanceof Error ? err.name : 'Unknown'

          isbnLogger.error({ message: errorMessage, name: errorName }, 'Scanner initialization error')

          if (errorName === 'NotAllowedError') {
            setError('Permiso de cámara denegado. Por favor permite el acceso.')
          } else if (errorName === 'NotFoundError') {
            setError('No se encontró cámara en este dispositivo')
          } else if (errorName === 'NotReadableError') {
            setError('La cámara está siendo usada por otra aplicación')
          } else {
            setError(`Error: ${errorMessage}`)
          }
        }
      }

      start()

      return () => {
        cancelled = true
        if (fallbackTimer) clearTimeout(fallbackTimer)
        if (decodingInterval) clearInterval(decodingInterval)
        if (readerRef.current) {
          try { readerRef.current.reset() } catch {}
          readerRef.current = null
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
      }
    }, [isActive, onDetected, onCapture, sessionId])

    // Si el padre pasa videoClassName con "absolute", el scanner debe llenar todo el espacio
    const isAbsoluteVideo = videoClassName?.includes('absolute')

    const videoClasses = isAbsoluteVideo
      ? videoClassName
      : ['w-full', videoClassName || 'h-[42dvh] max-h-[420px] min-h-64'].join(' ').trim()

    // Cuando el video es absolute, el contenedor debe llenar el espacio del padre
    if (isAbsoluteVideo) {
      return (
        <div className={`relative w-full h-full ${containerClassName || ''}`}>
          <video
            ref={videoRef}
            className={videoClasses}
            autoPlay
            playsInline
            muted
            style={{ objectFit: 'cover', background: '#000' }}
          />
          {error && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
              <p className="text-sm text-red-400 text-center font-medium px-4">{error}</p>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        <div className={`relative overflow-hidden rounded-2xl bg-black ring-1 ring-black/10 shadow-sm ${containerClassName || ''}`}>
          <div className="relative">
            <video
              ref={videoRef}
              className={videoClasses}
              autoPlay
              playsInline
              muted
              style={{ objectFit: 'cover', background: '#000' }}
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 grid place-items-center">
                <div className="w-56 h-36 rounded-xl ring-2 ring-white/70" />
              </div>
            </div>

            {isReady && !isFallingBackToOpenAI && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-500/90 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Buscando código de barras...
              </div>
            )}

            {isFallingBackToOpenAI && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-purple-500/90 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Analizando con IA...
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
              Escaneo gratis - Fallback IA automático en 5s
            </p>
          )}
          {isFallingBackToOpenAI && (
            <p className="text-sm text-purple-600 text-center font-medium">
              Usando OpenAI para detectar ISBN...
            </p>
          )}
        </div>
      </div>
    )
  }
)

IsbnScanner.displayName = 'IsbnScanner'

export default IsbnScanner
