'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'

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

const supportedFormats = ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e']

const IsbnScanner = forwardRef<IsbnScannerRef, IsbnScannerProps>(({
  onDetected,
  onCapture,
  onBarcodeSupportChange,
  isActive = true,
  containerClassName,
  videoClassName,
  sessionId
}, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)

  const [error, setError] = useState<string>('')
  const [isReady, setIsReady] = useState(false)

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
      
      canvas.toBlob((blob) => {
        if (!blob) return
        const file = new File([blob], 'snapshot.jpg', { type: 'image/jpeg' })
        onCapture(file)
      }, 'image/jpeg', 0.8)
    },
    canUseBarcodeDetector
  }))

  const canUseBarcodeDetector = useMemo(() => {
    return typeof window !== 'undefined' && 'BarcodeDetector' in window
  }, [])

  useEffect(() => {
    if (onBarcodeSupportChange) {
      onBarcodeSupportChange(canUseBarcodeDetector)
    }
  }, [canUseBarcodeDetector, onBarcodeSupportChange])

  useEffect(() => {
    if (!isActive) return

    let cancelled = false

    const start = async () => {
      setError('')
      setIsReady(false)

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
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

        if (!canUseBarcodeDetector) {
          setError('Este navegador no soporta barcode detector')
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({ formats: supportedFormats })

        const tick = async () => {
          if (!videoRef.current) return
          if (videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(tick)
            return
          }

          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const barcodes = await (detector as any).detect(videoRef.current)
            const rawValue = barcodes?.[0]?.rawValue
            if (typeof rawValue === 'string' && rawValue.trim()) {
              const normalized = rawValue.trim()
              onDetected(normalized)
              return
            }
          } catch (error) {
            console.error('[scanner] detect error', error)
          }

          rafRef.current = requestAnimationFrame(tick)
        }

        rafRef.current = requestAnimationFrame(tick)
      } catch (error) {
        console.error('[scanner] camera error', error)
        setError('No se pudo acceder a la cámara')
      }
    }

    start()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [isActive, onDetected, canUseBarcodeDetector, sessionId])

  const containerClasses = [
    'relative overflow-hidden rounded-2xl bg-black ring-1 ring-black/10 shadow-sm',
    containerClassName || ''
  ]
    .join(' ')
    .trim()

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }, [])

  const videoClasses = [
    'w-full object-cover',
    !isMobile && 'scale-x-[-1]',
    videoClassName || 'h-[42dvh] max-h-[420px] min-h-64'
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return (
    <div className='flex flex-col gap-2'>
      <div className={containerClasses}>
        <div className='relative'>
          <video ref={videoRef} className={videoClasses} playsInline muted />
          <div className='absolute inset-0 pointer-events-none'>
            <div className='absolute inset-0 grid place-items-center'>
              <div className='w-56 h-36 rounded-xl ring-2 ring-white/70' />
            </div>
          </div>
        </div>
      </div>

      <div className='px-1 min-h-[1.5em]'>
        {!isReady && !error && isActive && (
          <p className='text-sm text-gray-500 text-center animate-pulse'>Iniciando cámara...</p>
        )}
        {error && (
          <p className='text-sm text-red-600 text-center font-medium'>{error}</p>
        )}
      </div>
    </div>
  )
})

IsbnScanner.displayName = 'IsbnScanner'

export default IsbnScanner


