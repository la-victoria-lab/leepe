'use client'

import { useState } from 'react'
import { Star, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface RateBookModalProps {
  prestamoId: string
  libroTitulo: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function RateBookModal({
  prestamoId,
  libroTitulo,
  isOpen,
  onClose,
  onSuccess,
}: RateBookModalProps) {
  const [rating, setRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [comentario, setComentario] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Por favor selecciona una calificación')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/rate-book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prestamoId,
          rating,
          comentario: comentario.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la calificación')
      }

      // Éxito
      setRating(0)
      setComentario('')
      onSuccess?.()
      setTimeout(onClose, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-slate-800">¿Cómo fue el libro?</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Libro */}
        <p className="text-sm text-slate-600 mb-6 line-clamp-2">{libroTitulo}</p>

        {/* Estrellas */}
        <div className="flex justify-center gap-3 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={40}
                className={`${
                  star <= (hoveredRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300'
                } transition-colors`}
              />
            </button>
          ))}
        </div>

        {/* Mostrar rating seleccionado */}
        {rating > 0 && (
          <p className="text-center text-sm font-semibold text-amber-600 mb-4">
            {rating === 1 && 'Malo'}
            {rating === 2 && 'Regular'}
            {rating === 3 && 'Bueno'}
            {rating === 4 && 'Muy bueno'}
            {rating === 5 && '¡Excelente!'}
          </p>
        )}

        {/* Comentario opcional */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Comentario (opcional)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <p className="text-xs text-slate-400 mt-1">{comentario.length}/200</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Éxito */}
        {loading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-xl flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Guardando calificación...
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || loading}
            className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1" />
                Enviando...
              </>
            ) : (
              'Enviar'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
