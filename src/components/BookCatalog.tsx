'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Plus, Trash2, BookIcon, ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react'

interface Book {
  isbn: string
  titulo: string
  autores: string | null
  descripcion: string
  thumbnail: string
  image_path?: string
  is_active: boolean
}

export default function BookCatalog() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<{ last_page?: number; total?: number }>({})

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)

  const loadBooks = async (searchQuery = '', pageNum = page) => {
    setLoading(true)
    try {
      const query = new URLSearchParams({
        page: pageNum.toString(),
        limit: '12',
        search: searchQuery,
      })
      const res = await fetch(`/api/admin/books?${query}`)
      const data = await res.json()
      setBooks(data.data || [])
      setMeta(data.meta || {})
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBooks(search, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadBooks(search, 1)
  }

  const handleEdit = (book: Book) => {
    setEditingBook(book)
    setIsModalOpen(true)
  }

  const handleDelete = async (isbn: string) => {
    if (!confirm('¿Eliminar este libro? Esta acción no se puede deshacer.')) return
    try {
      const res = await fetch(`/api/admin/books?isbn=${isbn}`, { method: 'DELETE' })
      if (res.ok) {
        loadBooks(search, page)
      } else {
        alert('Error al eliminar')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSave = async (formData: FormData) => {
    const data = {
      isbn: formData.get('isbn'),
      titulo: formData.get('titulo'),
      autores: formData.get('autores'),
      descripcion: formData.get('descripcion'),
      thumbnail: formData.get('thumbnail'),
    }

    try {
      const res = await fetch('/api/admin/books', {
        method: editingBook ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setIsModalOpen(false)
        loadBooks(search, page)
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const lastPage = meta.last_page || 1

  return (
    <div className="flex flex-col h-full">
      {/* ═══════════════════════════════════════════════════════════════════
          STICKY TOOLBAR: Search + Pagination + Add Button
          Always visible, no scrolling required to access controls
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 bg-stone-50/95 backdrop-blur-md border-b border-stone-200/60 -mx-4 px-4 md:-mx-0 md:px-0 py-3 md:py-4 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <form
            onSubmit={handleSearch}
            className="relative flex-1 max-w-md"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 md:h-11 rounded-xl bg-white border-stone-200 focus-visible:ring-violet-500 text-sm font-medium"
            />
          </form>

          {/* Pagination Controls - Always Visible */}
          <div className="flex items-center gap-1 bg-white rounded-xl border border-stone-200 p-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 w-8 rounded-lg hover:bg-violet-50 hover:text-violet-600 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-stone-600 px-2 min-w-[60px] text-center tabular-nums">
              {page} / {lastPage}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={page >= lastPage}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 w-8 rounded-lg hover:bg-violet-50 hover:text-violet-600 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Add Button */}
          <Button
            onClick={() => {
              setEditingBook(null)
              setIsModalOpen(true)
            }}
            size="icon"
            className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-slate-900 hover:bg-slate-800 shadow-sm shrink-0"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* Total count indicator */}
        {meta.total !== undefined && (
          <p className="text-xs text-stone-400 mt-2 hidden md:block">
            {meta.total} libro{meta.total !== 1 ? 's' : ''} en total
          </p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CONTENT: Book Grid (Scrollable)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4 md:-mx-0 md:px-0 pb-24 md:pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-stone-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium">Cargando...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-stone-400">
            <div className="bg-stone-100 p-5 rounded-2xl">
              <BookIcon className="h-10 w-10" />
            </div>
            <div className="text-center">
              <p className="font-medium text-stone-600">Sin resultados</p>
              <p className="text-sm mt-1">Intenta con otra búsqueda</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {books.map((book) => (
              <Card
                key={book.isbn}
                className="group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-shadow duration-200 bg-white rounded-xl"
              >
                {/* Cover Image */}
                <div className="relative aspect-[2/3] bg-stone-100">
                  {book.thumbnail ? (
                    <img
                      src={book.thumbnail}
                      alt={book.titulo}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <BookIcon className="h-8 w-8" />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      onClick={() => handleEdit(book)}
                      className="h-8 w-8 rounded-lg bg-white/95 hover:bg-white text-stone-600 hover:text-violet-600 shadow-sm border border-stone-200/50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => handleDelete(book.isbn)}
                      className="h-8 w-8 rounded-lg bg-white/95 hover:bg-white text-stone-600 hover:text-red-500 shadow-sm border border-stone-200/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Book Info */}
                <CardContent className="p-3">
                  <h3
                    className="font-semibold text-sm text-stone-800 line-clamp-2 leading-snug"
                    title={book.titulo}
                  >
                    {book.titulo}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-1">{book.autores || 'Sin autor'}</p>
                  <p className="text-[10px] text-stone-400 font-mono mt-2">{book.isbn}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: Create/Edit Book
      ═══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Editar Libro' : 'Nuevo Libro'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSave(new FormData(e.currentTarget))
            }}
            className="space-y-4 mt-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">ISBN *</label>
              <Input
                name="isbn"
                defaultValue={editingBook?.isbn}
                required
                disabled={!!editingBook}
                placeholder="9781234567890"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Título *</label>
              <Input
                name="titulo"
                defaultValue={editingBook?.titulo}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Autores</label>
              <Input
                name="autores"
                defaultValue={editingBook?.autores || ''}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                name="descripcion"
                defaultValue={editingBook?.descripcion}
                className="w-full min-h-[80px] p-3 rounded-xl border border-stone-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL Portada</label>
              <Input
                name="thumbnail"
                defaultValue={editingBook?.thumbnail}
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
              >
                Guardar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
