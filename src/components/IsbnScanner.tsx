'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { scanImageData } from '@undecaf/zbar-wasm'
import { isbnLogger } from '@/lib/logger'
import { Camera } from 'lucide-react'

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

const AUTO_FALLBACK_TIMEOUT = 5000
const SCAN_INTERVAL = 300

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

/** Try to scan an image file for barcodes using ZBar WASM */
async function scanFileForBarcode(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const symbols = await scanImageData(imageData)
    if (symbols.length > 0) {
      const isbn = symbols[0].decode().trim()
      if (isbn) {
        isbnLogger.info({ isbn, method: 'zbar-wasm-photo' }, 'Barcode detected from photo')
        return isbn
      }
    }
  } catch (e) {
    isbnLogger.warn({ err: e }, 'ZBar scan on photo failed')
  }
  return null
}

const IsbnScanner = forwardRef<IsbnScannerRef, IsbnScannerProps>(
  (
    { onDetected, onCapture, onBarcodeSupportChange, isActive = true, containerClassName, videoClassName, sessionId },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const [error, setError] = useState<string>('')
    const [isReady, setIsReady] = useState(false)
    const [isFallingBackToOpenAI, setIsFallingBackToOpenAI] = useState(false)
    const [useCaptureMode, setUseCaptureMode] = useState(false)
    const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)

    useImperativeHandle(ref, () => ({
      capture: async () => {
        if (useCaptureMode) {
          fileInputRef.current?.click()
          return
        }
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

    /** Handle photo taken via native camera input */
    const handleFileCapture = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsProcessingPhoto(true)
        setError('')

        try {
          // First try ZBar on the photo
          const isbn = await scanFileForBarcode(file)
          if (isbn) {
            onDetected(isbn)
            return
          }

          // Fallback to OpenAI
          if (onCapture) {
            isbnLogger.info('Photo barcode not detected, sending to OpenAI')
            setIsFallingBackToOpenAI(true)
            onCapture(file)
          }
        } catch (err) {
          isbnLogger.error({ err }, 'Error processing captured photo')
          setError('Error al procesar la foto. Intenta de nuevo.')
        } finally {
          setIsProcessingPhoto(false)
          // Reset input so the same file can be selected again
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      },
      [onDetected, onCapture]
    )

    useEffect(() => {
      if (!isActive) return
      if (useCaptureMode) return // Don't try getUserMedia if we already know it fails

      let cancelled = false
      let fallbackTimer: NodeJS.Timeout | null = null
      let hasDetectedBarcode = false
      let scanInterval: NodeJS.Timeout | null = null

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
      }

      const start = async () => {
        setError('')
        setIsReady(false)
        setIsFallingBackToOpenAI(false)
        hasDetectedBarcode = false

        try {
          const video = videoRef.current
          if (!video) throw new Error('Video element not found')

          if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('NO_GETUSERMEDIA')
          }

          video.setAttribute('playsinline', 'true')
          video.setAttribute('webkit-playsinline', 'true')

          isbnLogger.info('Requesting camera access...')

          const constraintsList = [
            { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
            { video: { facingMode: 'environment' }, audio: false },
            { video: true, audio: false },
          ] as const

          const getStream = async (): Promise<MediaStream> => {
            let lastError: unknown
            for (const constraints of constraintsList) {
              try {
                return await navigator.mediaDevices.getUserMedia(constraints)
              } catch (e) {
                lastError = e
                isbnLogger.warn({ err: e, constraints: JSON.stringify(constraints) }, 'getUserMedia failed')
              }
            }
            throw lastError
          }

          const stream = await Promise.race([
            getStream(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('CAMERA_TIMEOUT')), 10000)
            ),
          ])

          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }

          streamRef.current = stream
          video.srcObject = stream

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('VIDEO_TIMEOUT')), 5000)
            video.onloadedmetadata = () => {
              setTimeout(() => {
                video
                  .play()
                  .then(() => {
                    clearTimeout(timeout)
                    isbnLogger.info(
                      { videoWidth: video.videoWidth, videoHeight: video.videoHeight },
                      'Video is playing'
                    )
                    resolve()
                  })
                  .catch((err) => {
                    clearTimeout(timeout)
                    reject(err)
                  })
              }, 100)
            }
          })

          if (cancelled) return
          setIsReady(true)

          isbnLogger.info('Starting ZBar WASM barcode scanning...')

          const canvas = canvasRef.current!

          const scanFrame = async () => {
            if (cancelled || hasDetectedBarcode || !video.videoWidth) return

            try {
              canvas.width = video.videoWidth
              canvas.height = video.videoHeight
              const ctx = canvas.getContext('2d')
              if (!ctx) return

              ctx.drawImage(video, 0, 0)
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
              const symbols = await scanImageData(imageData)

              if (symbols.length > 0 && !cancelled && !hasDetectedBarcode) {
                const barcode = symbols[0]
                const isbn = barcode.decode().trim()

                if (isbn) {
                  hasDetectedBarcode = true
                  isbnLogger.info({ isbn, type: barcode.typeName, method: 'zbar-wasm' }, 'Barcode detected')

                  if (fallbackTimer) {
                    clearTimeout(fallbackTimer)
                    fallbackTimer = null
                  }

                  onDetected(isbn)
                }
              }
            } catch (e) {
              isbnLogger.warn({ err: e }, 'ZBar scan error (non-critical)')
            }
          }

          scanInterval = setInterval(scanFrame, SCAN_INTERVAL)

          fallbackTimer = setTimeout(async () => {
            if (cancelled || hasDetectedBarcode || !onCapture) return
            isbnLogger.warn('ZBar could not detect barcode after 5s, auto-capturing for OpenAI')
            setIsFallingBackToOpenAI(true)

            const file = await captureFrame(video)
            if (file && !cancelled) {
              isbnLogger.info('Auto-captured image for OpenAI fallback')
              onCapture(file)
            }
          }, AUTO_FALLBACK_TIMEOUT)
        } catch (err) {
          if (cancelled) return

          // If getUserMedia fails for any reason, switch to native camera input
          isbnLogger.warn({ err }, 'getUserMedia failed, switching to native camera capture mode')
          setUseCaptureMode(true)
        }
      }

      start()

      return () => {
        cancelled = true
        if (fallbackTimer) clearTimeout(fallbackTimer)
        if (scanInterval) clearInterval(scanInterval)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
      }
    }, [isActive, onDetected, onCapture, sessionId, useCaptureMode])

    // --- Native camera capture mode (iOS PWA fallback) ---
    if (useCaptureMode) {
      return (
        <div className={`flex flex-col items-center justify-center gap-6 p-8 h-full ${containerClassName || ''}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileCapture}
            className="hidden"
          />

          {isProcessingPhoto || isFallingBackToOpenAI ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <div className="w-8 h-8 border-[3px] border-white/80 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm font-medium text-white/80">
                {isFallingBackToOpenAI ? 'Analizando con IA...' : 'Procesando foto...'}
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-xl shadow-black/30 active:scale-95 transition-transform"
              >
                <Camera size={48} strokeWidth={1.5} />
              </button>
              <div className="text-center">
                <p className="text-base font-bold text-white">Tomar foto del código</p>
                <p className="text-sm text-white/50 mt-1">Se abrirá la cámara de tu dispositivo</p>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-400 text-center font-medium">{error}</p>}
        </div>
      )
    }

    // --- getUserMedia live video mode ---
    const isAbsoluteVideo = videoClassName?.includes('absolute')

    const videoClasses = isAbsoluteVideo
      ? videoClassName
      : ['w-full', videoClassName || 'h-[42dvh] max-h-[420px] min-h-64'].join(' ').trim()

    if (isAbsoluteVideo) {
      return (
        <div className={`relative w-full h-full ${containerClassName || ''}`}>
          <video
            ref={videoRef}
            className={videoClasses}
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
        <div
          className={`relative overflow-hidden rounded-2xl bg-black ring-1 ring-black/10 shadow-sm ${containerClassName || ''}`}
        >
          <div className="relative">
            <video
              ref={videoRef}
              className={videoClasses}
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
            <p className="text-sm text-gray-500 text-center">Escaneo gratis - Fallback IA automático en 5s</p>
          )}
          {isFallingBackToOpenAI && (
            <p className="text-sm text-purple-600 text-center font-medium">Usando OpenAI para detectar ISBN...</p>
          )}
        </div>
      </div>
    )
  }
)

IsbnScanner.displayName = 'IsbnScanner'

export default IsbnScanner
