'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  BookOpen,
  CheckCircle,
  XCircle,
  List,
  Grid3x3,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LOAN_CONFIG } from '@/lib/loan-config'

interface Libro {
  isbn: string
  titulo: string
  autores: string[] | null
  thumbnail: string | null
  copias_total: number
  copias_disponibles: number
  disponible: boolean
  generos?: string[]
  idioma?: string
}

interface CatalogResponse {
  books: Libro[]
  filters: {
    genres: string[]
    languages: string[]
    authors: string[]
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface Filters {
  search: string
  genre: string
  language: string
  availability: 'all' | 'available' | 'unavailable'
  sort: 'titulo' | 'rating' | 'recent'
}

type UserCatalogTabProps = {
  onBorrow?: () => void
}

export default function UserCatalogTab({ onBorrow }: UserCatalogTabProps) {
  const [libros, setLibros] = useState<Libro[]>([])
  const [loading, setLoading] = useState(true)
  const [borrowingIsbn, setBorrowingIsbn] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [expandedFilters, setExpandedFilters] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [filters, setFilters] = useState<Filters>({
    search: '',
    genre: '',
    language: '',
    availability: 'all',
    sort: 'titulo',
  })

  const [filterOptions, setFilterOptions] = useState({
    genres: [] as string[],
    languages: [] as string[],
    authors: [] as string[],
  })

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })

  const fetchLibros = useCallback(
    async (newFilters: Filters, signal?: AbortSignal) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (newFilters.search) params.append('q', newFilters.search)
        if (newFilters.genre) params.append('genre', newFilters.genre)
        if (newFilters.language) params.append('language', newFilters.language)
        params.append('availability', newFilters.availability)
        params.append('sort', newFilters.sort)
        params.append('page', '1')
        params.append('limit', '50')

        const res = await fetch(`/api/user/catalog?${params.toString()}`, { signal })
        if (!res.ok) throw new Error('Error fetching catalog')

        const data: CatalogResponse = await res.json()
        setLibros(data.books || [])
        setFilterOptions(data.filters)
        setPagination(data.pagination)

        // Generar sugerencias de búsqueda
        if (newFilters.search && data.books.length > 0) {
          const suggestions = Array.from(
            new Set(
              data.books
                .slice(0, 5)
                .map((libro) => libro.titulo)
                .filter((titulo) =>
                  titulo.toLowerCase().includes(newFilters.search.toLowerCase())
                )
            )
          )
          setSearchSuggestions(suggestions)
        } else {
          setSearchSuggestions([])
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error fetching libros:', err)
          setLibros([])
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Debounce búsqueda
  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => fetchLibros(filters, controller.signal), 300)
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [filters, fetchLibros])

  const handleBorrow = async (isbn: string) => {
    if (borrowingIsbn) return
    setBorrowingIsbn(isbn)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await fetch('/api/lend-book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isbn }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al prestar')

      setSuccessMsg(`¡Prestado! Devuélvelo en ${LOAN_CONFIG.INITIAL_DAYS} días`)
      setTimeout(() => setSuccessMsg(''), 4000)
      await fetchLibros(filters)
      onBorrow?.()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al prestar')
      setTimeout(() => setErrorMsg(''), 4000)
    } finally {
      setBorrowingIsbn(null)
    }
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      genre: '',
      language: '',
      availability: 'all',
      sort: 'titulo',
    })
  }

  const activeFilterCount = [
    filters.search,
    filters.genre,
    filters.language,
    filters.availability !== 'all',
  ].filter(Boolean).length

  return (
    <div className="flex flex-col h-full">
      {/* HEADER: Búsqueda y Toggle */}
      <div className="px-4 pt-4 pb-2 shrink-0 space-y-3">
        {/* Buscador con autocompletado */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por título o autor..."
              value={filters.search}
              onChange={(e) => {
                handleFilterChange('search', e.target.value)
                setShowSuggestions(e.target.value.length > 0)
              }}
              onFocus={() => filters.search && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 shadow-sm"
            />
          </div>

          {/* Autocompletado */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10">
              {searchSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    handleFilterChange('search', suggestion)
                    setShowSuggestions(false)
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-violet-50 text-sm text-slate-700 border-b border-slate-100 last:border-b-0"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Controles: Filtros + View Mode */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setExpandedFilters(!expandedFilters)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors"
          >
            <span>🔍 Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
            {expandedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="h-8"
            >
              <List size={14} />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className="h-8"
            >
              <Grid3x3 size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* FILTROS EXPANDIBLES */}
      {expandedFilters && (
        <div className="px-4 py-3 shrink-0 bg-violet-50 border-b border-violet-200 space-y-3">
          {/* Género */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-2 block">Género</label>
            <div className="flex flex-wrap gap-2">
              {filterOptions.genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() =>
                    handleFilterChange('genre', filters.genre === genre ? '' : genre)
                  }
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    filters.genre === genre
                      ? 'bg-violet-600 text-white'
                      : 'bg-white border border-violet-200 text-slate-700 hover:bg-violet-100'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Idioma */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-2 block">Idioma</label>
            <div className="flex flex-wrap gap-2">
              {filterOptions.languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() =>
                    handleFilterChange('language', filters.language === lang ? '' : lang)
                  }
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    filters.language === lang
                      ? 'bg-violet-600 text-white'
                      : 'bg-white border border-violet-200 text-slate-700 hover:bg-violet-100'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Disponibilidad */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-2 block">Disponibilidad</label>
            <div className="flex gap-2">
              {(['all', 'available', 'unavailable'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() =>
                    handleFilterChange('availability', opt)
                  }
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    filters.availability === opt
                      ? 'bg-violet-600 text-white'
                      : 'bg-white border border-violet-200 text-slate-700 hover:bg-violet-100'
                  }`}
                >
                  {opt === 'all'
                    ? 'Todos'
                    : opt === 'available'
                    ? 'Disponibles'
                    : 'No disponibles'}
                </button>
              ))}
            </div>
          </div>

          {/* Ordenar */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-2 block">Ordenar por</label>
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white border border-violet-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="titulo">Título A-Z</option>
              <option value="rating">Rating</option>
              <option value="recent">Recientes</option>
            </select>
          </div>

          {/* Botón limpiar */}
          {activeFilterCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearFilters}
              className="w-full text-xs text-red-600 hover:bg-red-50"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      )}

      {/* FILTROS APLICADOS */}
      {activeFilterCount > 0 && (
        <div className="px-4 py-2 shrink-0 flex flex-wrap gap-2">
          {filters.search && (
            <div className="flex items-center gap-1 bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-full">
              <span>🔍 {filters.search}</span>
              <button onClick={() => handleFilterChange('search', '')} className="hover:opacity-70">
                <X size={12} />
              </button>
            </div>
          )}
          {filters.genre && (
            <div className="flex items-center gap-1 bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-full">
              <span>{filters.genre}</span>
              <button onClick={() => handleFilterChange('genre', '')} className="hover:opacity-70">
                <X size={12} />
              </button>
            </div>
          )}
          {filters.language && (
            <div className="flex items-center gap-1 bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-full">
              <span>{filters.language}</span>
              <button onClick={() => handleFilterChange('language', '')} className="hover:opacity-70">
                <X size={12} />
              </button>
            </div>
          )}
          {filters.availability !== 'all' && (
            <div className="flex items-center gap-1 bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-full">
              <span>
                {filters.availability === 'available' ? 'Disponibles' : 'No disponibles'}
              </span>
              <button
                onClick={() => handleFilterChange('availability', 'all')}
                className="hover:opacity-70"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO: LIST VIEW */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="space-y-3 pt-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-slate-200 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : libros.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <BookOpen size={48} className="text-slate-300 mb-2" />
            <p className="text-slate-400 text-sm">
              {filters.search || filters.genre ? 'Sin resultados' : 'Cargando catálogo...'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3 pt-4">
            {libros.map((libro) => (
              <div
                key={libro.isbn}
                className="flex gap-3 p-3 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-shadow"
              >
                {/* Thumbnail */}
                <div className="w-12 aspect-[2/3] bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                  {libro.thumbnail ? (
                    <img
                      src={libro.thumbnail}
                      alt={libro.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={16} className="text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <h3 className="font-bold text-sm text-slate-800 line-clamp-1">
                    {libro.titulo}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-1">
                    {Array.isArray(libro.autores)
                      ? libro.autores.join(', ')
                      : libro.autores || '—'}
                  </p>

                  {/* Género badges */}
                  {libro.generos && libro.generos.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {libro.generos.slice(0, 2).map((g) => (
                        <span
                          key={g}
                          className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Disponibilidad + Botón */}
                  <div className="flex items-center justify-between mt-auto">
                    <span
                      className={`text-xs font-semibold ${
                        libro.disponible ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {libro.disponible
                        ? `${libro.copias_disponibles}/${libro.copias_total}`
                        : 'No disponible'}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleBorrow(libro.isbn)}
                      disabled={!libro.disponible || borrowingIsbn === libro.isbn}
                      className="h-7 text-xs rounded-lg"
                    >
                      {borrowingIsbn === libro.isbn ? '...' : 'Pedir'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* GRID VIEW */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
            {libros.map((libro) => (
              <div
                key={libro.isbn}
                className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Thumbnail 2:3 ratio */}
                <div className="w-full aspect-[2/3] bg-slate-100 overflow-hidden">
                  {libro.thumbnail ? (
                    <img
                      src={libro.thumbnail}
                      alt={libro.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={24} className="text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2 flex flex-col flex-1">
                  <h3 className="font-bold text-xs text-slate-800 line-clamp-2 mb-0.5">
                    {libro.titulo}
                  </h3>
                  <p className="text-[10px] text-slate-500 line-clamp-1 mb-1">
                    {Array.isArray(libro.autores)
                      ? libro.autores.join(', ')
                      : libro.autores || '—'}
                  </p>

                  {/* Géneros */}
                  {libro.generos && libro.generos.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mb-1">
                      {libro.generos.slice(0, 1).map((g) => (
                        <span
                          key={g}
                          className="text-[9px] bg-violet-100 text-violet-700 px-1 py-0.5 rounded"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Disponibilidad */}
                  <div className="mt-auto">
                    <p
                      className={`text-[10px] font-semibold mb-1 ${
                        libro.disponible ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {libro.disponible
                        ? `${libro.copias_disponibles}/${libro.copias_total}`
                        : 'No disponible'}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleBorrow(libro.isbn)}
                      disabled={!libro.disponible || borrowingIsbn === libro.isbn}
                      className="w-full h-7 text-xs rounded-lg"
                    >
                      {borrowingIsbn === libro.isbn ? '...' : 'Pedir'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOASTS */}
      {successMsg && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
          <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm shadow-lg flex items-center gap-2">
            <CheckCircle size={16} className="flex-shrink-0" />
            {successMsg}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm shadow-lg flex items-center gap-2">
            <XCircle size={16} className="flex-shrink-0" />
            {errorMsg}
          </div>
        </div>
      )}
    </div>
  )
}
