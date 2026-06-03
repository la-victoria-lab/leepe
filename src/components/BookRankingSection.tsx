'use client'

import { useEffect, useState } from 'react'
import { Star, Loader2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import ReactionButtons from './ReactionButtons'

interface Comentario {
  rating: number
  comentario: string | null
  usuario: string
  likeCount?: number
  loveCount?: number
  userReaction?: 'like' | 'love' | null
}

interface RankedBook {
  isbn: string
  titulo: string
  autores: string[] | null
  thumbnail: string | null
  promedioRating: number
  totalRatings: number
  comentarios?: Comentario[]
}

export default function BookRankingSection() {
  const [ranking, setRanking] = useState<RankedBook[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIsbn, setExpandedIsbn] = useState<string | null>(null)

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const res = await fetch('/api/books/ranking?limit=10')
        const data = await res.json()
        console.log('Ranking data:', data)
        setRanking(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error fetching ranking:', err)
        setRanking([])
      } finally {
        setLoading(false)
      }
    }

    fetchRanking()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-violet-600" size={32} />
      </div>
    )
  }

  if (ranking.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Star size={40} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">Aún no hay libros calificados</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {ranking.map((libro, index) => {
        const isExpanded = expandedIsbn === libro.isbn
        const tieneComentarios = libro.comentarios && libro.comentarios.length > 0

        return (
          <div
            key={libro.isbn}
            className="bg-gradient-to-r from-violet-50 to-transparent border border-violet-100 rounded-2xl overflow-hidden transition-all"
          >
            {/* Header del Card */}
            <button
              onClick={() => tieneComentarios && setExpandedIsbn(isExpanded ? null : libro.isbn)}
              className="w-full text-left p-4 flex gap-4 hover:bg-violet-100/50 transition-colors"
              disabled={!tieneComentarios}
            >
              {/* Posición */}
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-violet-600 text-white font-bold text-sm">
                #{index + 1}
              </div>

              {/* Portada */}
              <div className="w-12 aspect-[2/3] rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                {libro.thumbnail ? (
                  <img src={libro.thumbnail} alt={libro.titulo} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={16} className="text-slate-300" />
                  </div>
                )}
              </div>

              {/* Información */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{libro.titulo}</h3>
                <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                  {Array.isArray(libro.autores) ? libro.autores.join(', ') : libro.autores || '—'}
                </p>

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={`${
                          star <= Math.round(libro.promedioRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    {libro.promedioRating.toFixed(1)}
                  </span>
                  <span className={`text-xs ${tieneComentarios ? 'text-violet-600 font-semibold cursor-pointer' : 'text-slate-500'}`}>
                    ({libro.totalRatings} {libro.totalRatings === 1 ? 'calificación' : 'calificaciones'})
                  </span>
                </div>
              </div>

              {/* Chevron para expandir */}
              {tieneComentarios && (
                <div className="flex-shrink-0 flex items-center">
                  {isExpanded ? (
                    <ChevronUp size={20} className="text-violet-600" />
                  ) : (
                    <ChevronDown size={20} className="text-slate-400" />
                  )}
                </div>
              )}
            </button>

            {/* Comentarios expandidos */}
            {isExpanded && tieneComentarios && libro.comentarios && (
              <div className="border-t border-violet-100 bg-violet-50/50 p-4 space-y-3">
                {libro.comentarios.map((comentario, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${
                              star <= comentario.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{comentario.usuario}</span>
                    </div>
                    {comentario.comentario && (
                      <p className="text-xs text-slate-600 italic">&quot;{comentario.comentario}&quot;</p>
                    )}
                    <ReactionButtons
                      likeCount={comentario.likeCount || 0}
                      loveCount={comentario.loveCount || 0}
                      userReaction={comentario.userReaction || null}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
