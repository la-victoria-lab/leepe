'use client'

import { useState, useEffect } from 'react'
import { MapPin, Plus, Pencil, Trash2, BookIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Espacio {
  id: string
  nombre: string
  descripcion: string | null
  libros_count: number
}

export default function EspaciosTab() {
  const [espacios, setEspacios] = useState<Espacio[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEspacio, setEditingEspacio] = useState<Espacio | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/espacios?with_count=true')
      const data = await res.json()
      setEspacios(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingEspacio(null)
    setError('')
    setIsModalOpen(true)
  }

  const openEdit = (espacio: Espacio) => {
    setEditingEspacio(espacio)
    setError('')
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"? Los libros asignados quedarán sin espacio.`)) return
    const res = await fetch(`/api/admin/espacios?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      load()
    } else {
      const data = await res.json()
      alert(data.error || 'Error al eliminar')
    }
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const body = {
      id: editingEspacio?.id,
      nombre: formData.get('nombre') as string,
      descripcion: (formData.get('descripcion') as string) || null,
    }

    const res = await fetch('/api/admin/espacios', {
      method: editingEspacio ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setIsModalOpen(false)
      load()
    } else {
      const data = await res.json()
      setError(data.error || 'Error al guardar')
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="hidden md:block">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Espacios</h2>
          <p className="text-slate-500 font-medium">Ubicaciones físicas de los libros</p>
        </div>
        <Button
          onClick={openCreate}
          className="ml-auto h-10 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo espacio
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </div>
      ) : espacios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-stone-400">
          <div className="bg-stone-100 p-5 rounded-2xl">
            <MapPin className="h-10 w-10" />
          </div>
          <div className="text-center">
            <p className="font-medium text-stone-600">Sin espacios aún</p>
            <p className="text-sm mt-1">Crea el primer espacio físico para organizar los libros</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {espacios.map((espacio) => (
            <div
              key={espacio.id}
              className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="bg-violet-100 p-2 rounded-xl shrink-0">
                    <MapPin className="h-4 w-4 text-violet-600" />
                  </div>
                  <h3 className="font-bold text-slate-800 truncate">{espacio.nombre}</h3>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(espacio)}
                    className="h-8 w-8 rounded-lg hover:bg-violet-50 hover:text-violet-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(espacio.id, espacio.nombre)}
                    className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {espacio.descripcion && (
                <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">{espacio.descripcion}</p>
              )}

              <div className="flex items-center gap-1.5 text-xs font-medium text-stone-400 pt-2 border-t border-stone-50">
                <BookIcon className="h-3.5 w-3.5" />
                <span>
                  {espacio.libros_count} libro{espacio.libros_count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Dialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingEspacio ? 'Editar espacio' : 'Nuevo espacio'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSave}
            className="space-y-4 mt-2"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre *</label>
              <Input
                name="nombre"
                defaultValue={editingEspacio?.nombre}
                required
                placeholder="Ej: Estante A, Sala 2, Pasillo Norte..."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Input
                name="descripcion"
                defaultValue={editingEspacio?.descripcion || ''}
                placeholder="Ej: Planta baja, junto a la entrada"
              />
            </div>
            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="flex-1"
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
