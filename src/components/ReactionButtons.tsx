'use client'

import { useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ReactionType = 'like' | 'love'

interface ReactionButtonsProps {
  likeCount?: number
  loveCount?: number
  userReaction?: ReactionType | null
  onLike?: () => void
  onLove?: () => void
  disabled?: boolean
  bookRatingId?: string
}

export default function ReactionButtons({
  likeCount = 0,
  loveCount = 0,
  userReaction = null,
  onLike,
  onLove,
  disabled = false,
  bookRatingId,
}: ReactionButtonsProps) {
  const [tempLikeCount, setTempLikeCount] = useState(likeCount)
  const [tempLoveCount, setTempLoveCount] = useState(loveCount)
  const [tempReaction, setTempReaction] = useState(userReaction)
  const [loading, setLoading] = useState(false)

  const handleReactionClick = useCallback(
    async (reactionType: ReactionType) => {
      if (disabled || loading || !bookRatingId) {
        // Si no hay bookRatingId, solo hacer cambios visuales locales
        let newCount = reactionType === 'like' ? tempLikeCount : tempLoveCount
        let newReaction = tempReaction

        if (tempReaction === reactionType) {
          newCount = reactionType === 'like' ? tempLikeCount - 1 : tempLoveCount - 1
          newReaction = null
        } else {
          if (tempReaction === 'like') {
            setTempLikeCount(prev => Math.max(0, prev - 1))
          } else if (tempReaction === 'love') {
            setTempLoveCount(prev => Math.max(0, prev - 1))
          }
          newCount = reactionType === 'like' ? tempLikeCount + 1 : tempLoveCount + 1
          newReaction = reactionType
        }

        if (reactionType === 'like') {
          setTempLikeCount(newCount)
        } else {
          setTempLoveCount(newCount)
        }
        setTempReaction(newReaction)
        if (reactionType === 'like') {
          onLike?.()
        } else {
          onLove?.()
        }
        return
      }

      setLoading(true)
      const previousReaction = tempReaction
      const previousLikes = tempLikeCount
      const previousLoves = tempLoveCount

      try {
        // Optimistic update
        if (tempReaction === reactionType) {
          // Eliminar reacción
          setTempReaction(null)
          if (reactionType === 'like') {
            setTempLikeCount(prev => Math.max(0, prev - 1))
          } else {
            setTempLoveCount(prev => Math.max(0, prev - 1))
          }
        } else {
          // Cambiar o agregar reacción
          if (previousReaction === 'like') {
            setTempLikeCount(prev => Math.max(0, prev - 1))
          } else if (previousReaction === 'love') {
            setTempLoveCount(prev => Math.max(0, prev - 1))
          }

          setTempReaction(reactionType)
          if (reactionType === 'like') {
            setTempLikeCount(prev => prev + 1)
          } else {
            setTempLoveCount(prev => prev + 1)
          }
        }

        // API call
        if (tempReaction === reactionType) {
          // DELETE - eliminar reacción
          const response = await fetch(`/api/rate-book/react?bookRatingId=${bookRatingId}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            throw new Error('Error al eliminar reacción')
          }
        } else {
          // POST - agregar/cambiar reacción
          const response = await fetch('/api/rate-book/react', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              bookRatingId,
              reactionType,
            }),
          })

          if (!response.ok) {
            throw new Error('Error al guardar reacción')
          }
        }

        if (reactionType === 'like') {
          onLike?.()
        } else {
          onLove?.()
        }
      } catch (error) {
        console.error('Error updating reaction:', error)
        // Revert optimistic update
        setTempReaction(previousReaction)
        setTempLikeCount(previousLikes)
        setTempLoveCount(previousLoves)
      } finally {
        setLoading(false)
      }
    },
    [bookRatingId, tempReaction, tempLikeCount, tempLoveCount, disabled, loading, onLike, onLove]
  )

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleReactionClick('like')}
        disabled={loading || disabled}
        className={cn(
          'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
          'border border-slate-200 hover:border-slate-300',
          tempReaction === 'like'
            ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
            : 'bg-white text-slate-600 hover:bg-slate-50',
          (loading || disabled) && 'opacity-60 cursor-not-allowed'
        )}
      >
        {loading && !disabled ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <span className={tempReaction === 'like' ? 'font-bold' : ''}>👍</span>
        )}
        <span className="text-xs font-semibold">{tempLikeCount}</span>
      </button>

      <button
        onClick={() => handleReactionClick('love')}
        disabled={loading || disabled}
        className={cn(
          'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
          'border border-slate-200 hover:border-slate-300',
          tempReaction === 'love'
            ? 'bg-red-50 text-red-600 border-red-200 shadow-sm'
            : 'bg-white text-slate-600 hover:bg-slate-50',
          (loading || disabled) && 'opacity-60 cursor-not-allowed'
        )}
      >
        {loading && !disabled ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <span className={tempReaction === 'love' ? 'font-bold' : ''}>❤️</span>
        )}
        <span className="text-xs font-semibold">{tempLoveCount}</span>
      </button>
    </div>
  )
}
