'use client'

import { useEffect, useState, useCallback } from 'react'
import { Star, Loader2, ChevronDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import ReactionButtons from './ReactionButtons'

type SortOption = 'recent' | 'popular' | 'rating'

interface Review {
  id: string
  rating: number
  comentario: string | null
  created_at: string
  usuario_nombre: string
  usuario_avatar?: string | null
  libro_titulo: string
  libro_autores: string | null
  libro_thumbnail: string | null
  likeCount: number
  loveCount: number
  userReaction?: 'like' | 'love' | null
}

export default function AdminForumTab() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [filterBook, setFilterBook] = useState<string>('')
  const [searchUser, setSearchUser] = useState<string>('')
  const [books, setBooks] = useState<Array<{ titulo: string; autores: string | null }>>([])
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string>('')

  // Fetch reviews
  const fetchReviews = useCallback(
    async (pageNum: number) => {
      try {
        const params = new URLSearchParams()
        params.append('page', String(pageNum))
        params.append('limit', '20')
        params.append('sort', sortBy)
        if (filterBook) {
          params.append('filterBook', filterBook)
        }
        if (searchUser) {
          params.append('searchUser', searchUser)
        }

        const response = await fetch(`/api/forum/reviews?${params.toString()}`)
        if (!response.ok) throw new Error('Error fetching reviews')

        const data = (await response.json()) as {
          reviews: Review[]
          hasMore: boolean
          books?: Array<{ titulo: string; autores: string | null }>
        }

        if (pageNum === 1) {
          setReviews(data.reviews)
          if (data.books) setBooks(data.books)
        } else {
          setReviews(prev => [...prev, ...data.reviews])
        }

        setHasMore(data.hasMore)
      } catch (error) {
        console.error('Error fetching reviews:', error)
      } finally {
        setLoading(false)
      }
    },
    [sortBy, filterBook, searchUser]
  )

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetchReviews(1)
  }, [sortBy, filterBook, searchUser, fetchReviews])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchReviews(nextPage)
  }

  const handleDelete = async (reviewId: string) => {
    const confirmed = confirm('¿Eliminar esta reseña? No se puede deshacer.')
    if (!confirmed) return

    setDeletingId(reviewId)

    try {
      const response = await fetch(`/api/forum/reviews/${reviewId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Error deleting review')

      setReviews(prev => prev.filter(r => r.id !== reviewId))
      setDeleteSuccess('Reseña eliminada correctamente')
      setTimeout(() => setDeleteSuccess(''), 3000)
    } catch (error) {
      console.error('Error deleting review:', error)
      alert('Error al eliminar la reseña')
    } finally {
      setDeletingId(null)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            size={14}
            className={cn(
              'transition-colors',
              star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
            )}
          />
        ))}
      </div>
    )
  }

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={32} />
          <p className="text-slate-500 font-medium">Cargando reseñas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header con búsqueda y filtros */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por usuario..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="pl-9 rounded-lg"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Ordenar */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
            >
              Ordenar
              <ChevronDown
                size={14}
                className={cn(
                  'transition-transform',
                  showSortMenu && 'rotate-180'
                )}
              />
            </button>
            {showSortMenu && (
              <div className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border border-slate-200 z-10 min-w-40">
                {(['recent', 'popular', 'rating'] as SortOption[]).map(option => (
                  <button
                    key={option}
                    onClick={() => {
                      setSortBy(option)
                      setShowSortMenu(false)
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm transition-colors',
                      option === sortBy ? 'bg-blue-50 text-blue-600 font-semibold' : 'hover:bg-slate-50'
                    )}
                  >
                    {option === 'recent' && 'Más recientes'}
                    {option === 'popular' && 'Más populares'}
                    {option === 'rating' && 'Mejor rating'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filtrar por libro */}
          {books.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
              >
                {filterBook ? `${filterBook.substring(0, 20)}...` : 'Filtrar'}
                <ChevronDown
                  size={14}
                  className={cn(
                    'transition-transform',
                    showFilterMenu && 'rotate-180'
                  )}
                />
              </button>
              {showFilterMenu && (
                <div className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border border-slate-200 z-10 max-w-64 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setFilterBook('')
                      setShowFilterMenu(false)
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm transition-colors',
                      !filterBook && 'bg-blue-50 text-blue-600 font-semibold'
                    )}
                  >
                    Todos los libros
                  </button>
                  {books.map((book, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setFilterBook(book.titulo)
                        setShowFilterMenu(false)
                      }}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm transition-colors truncate hover:bg-slate-50',
                        filterBook === book.titulo && 'bg-blue-50 text-blue-600 font-semibold'
                      )}
                    >
                      {book.titulo}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast de éxito */}
      {deleteSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm animate-in slide-in-from-top">
          {deleteSuccess}
        </div>
      )}

      {/* Lista de reseñas */}
      {reviews.length === 0 ? (
        <div className="bg-white/50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <p className="text-slate-400 font-medium">No hay reseñas</p>
          <p className="text-slate-300 text-sm mt-2">Ajusta los filtros o búsqueda</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div
              key={review.id}
              className="group bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all"
            >
              {/* Header: Avatar + Nombre + Fecha + Botón delete */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {review.usuario_nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                      {review.usuario_nombre}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(review.created_at).toLocaleDateString('es', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>

                {/* Botón Moderar */}
                <button
                  onClick={() => handleDelete(review.id)}
                  disabled={deletingId === review.id}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-lg border transition-all',
                    'text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300',
                    'opacity-0 group-hover:opacity-100',
                    deletingId === review.id && 'opacity-100 bg-red-50'
                  )}
                >
                  {deletingId === review.id ? (
                    <>
                      <Loader2 size={12} className="inline animate-spin mr-1" />
                      Eliminando...
                    </>
                  ) : (
                    '🗑️ Moderar'
                  )}
                </button>
              </div>

              {/* Rating */}
              <div className="mb-3">
                {renderStars(review.rating)}
              </div>

              {/* Comentario */}
              {review.comentario && (
                <p className="text-sm text-slate-700 mb-3 leading-relaxed">
                  {review.comentario}
                </p>
              )}

              {/* Libro */}
              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-1">📚 Libro</p>
                <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                  {review.libro_titulo}
                </p>
                {review.libro_autores && (
                  <p className="text-xs text-slate-600 line-clamp-1">
                    {review.libro_autores}
                  </p>
                )}
              </div>

              {/* Reaction Buttons (read-only para admin) */}
              <ReactionButtons
                bookRatingId={review.id}
                likeCount={review.likeCount}
                loveCount={review.loveCount}
                userReaction={review.userReaction}
                disabled
              />
            </div>
          ))}
        </div>
      )}

      {/* Cargar más */}
      {hasMore && (
        <div className="mt-8 text-center">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            className="rounded-xl"
          >
            Cargar más reseñas
          </Button>
        </div>
      )}
    </div>
  )
}
