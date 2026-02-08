'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Plus, Trash2, BookIcon } from 'lucide-react'

interface Book {
  isbn: string
  titulo: string
  autores: string | null // API might return string if converted
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
  const [meta, setMeta] = useState<any>({})

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)

  // Data load
  const loadBooks = async (searchParams = '') => {
    setLoading(true)
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: searchParams,
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

  // Initial load
  useState(() => {
    loadBooks()
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1) // Reset to page 1
    loadBooks(search)
  }

  const handleEdit = (book: Book) => {
    setEditingBook(book)
    setIsModalOpen(true)
  }

  const handleDelete = async (isbn: string) => {
    if (!confirm('¿Estás seguro de eliminar este libro? Esta acción no se puede deshacer.')) return

    try {
      const res = await fetch(`/api/admin/books?isbn=${isbn}`, { method: 'DELETE' })
      if (res.ok) {
        loadBooks(search)
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
      autores: formData.get('autores'), // Handle as string or JSON array
      descripcion: formData.get('descripcion'),
      thumbnail: formData.get('thumbnail'),
    }

    const url = '/api/admin/books'
    const method = editingBook ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setIsModalOpen(false)
        loadBooks(search)
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <form
          onSubmit={handleSearch}
          className="flex-1 max-w-sm flex gap-2"
        >
          <Input
            placeholder="Buscar por título, autor o ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            type="submit"
            variant="secondary"
          >
            Buscar
          </Button>
        </form>
        <Button
          onClick={() => {
            setEditingBook(null)
            setIsModalOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo Libro
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10">Cargando catálogo...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {books.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-500">No se encontraron libros</div>
          ) : (
            books.map((book) => (
              <Card
                key={book.isbn}
                className="overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[3/4] bg-gray-100">
                  {book.thumbnail ? (
                    <img
                      src={book.thumbnail}
                      alt={book.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <BookIcon size={48} />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-white/90 hover:bg-white"
                      onClick={() => handleEdit(book)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => handleDelete(book.isbn)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-2">{book.titulo}</h3>
                  <p className="text-sm text-gray-500 mb-2 line-clamp-1">{book.autores}</p>
                  <p className="text-xs text-gray-400 mt-auto font-mono">{book.isbn}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-6">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => {
            setPage((p) => p - 1)
            loadBooks()
          }}
        >
          Anterior
        </Button>
        <span className="flex items-center px-4 text-sm text-gray-600">
          Página {page} de {meta.last_page || 1}
        </span>
        <Button
          variant="outline"
          disabled={page >= (meta.last_page || 1)}
          onClick={() => {
            setPage((p) => p + 1)
            loadBooks()
          }}
        >
          Siguiente
        </Button>
      </div>

      {/* Edit/Create Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Editar Libro' : 'Nuevo Libro'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSave(new FormData(e.currentTarget))
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">ISBN *</label>
              <Input
                name="isbn"
                defaultValue={editingBook?.isbn}
                required
                disabled={!!editingBook} // Cannot change ISBN when editing
                placeholder="13 dígitos (ej: 9781234567890)"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Título *</label>
              <Input
                name="titulo"
                defaultValue={editingBook?.titulo}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Autores</label>
              <Input
                name="autores"
                defaultValue={editingBook?.autores || ''}
                placeholder="Separados por comas"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                name="descripcion"
                defaultValue={editingBook?.descripcion}
                className="w-full min-h-[100px] p-2 rounded-md border text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL Portada</label>
              <Input
                name="thumbnail"
                defaultValue={editingBook?.thumbnail}
                placeholder="https://..."
              />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
