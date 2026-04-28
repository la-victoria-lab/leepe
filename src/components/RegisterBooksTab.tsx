'use client'

import { useState, useEffect } from 'react'
import { UploadCloud, CheckCircle2, AlertTriangle, XCircle, FileImage, Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Espacio {
  id: string
  nombre: string
}

export default function RegisterBooksTab() {
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [espacios, setEspacios] = useState<Espacio[]>([])
  const [espacioId, setEspacioId] = useState<string>('')
  const [result, setResult] = useState<{
    registered?: Array<{ isbn: string; titulo: string }>
    duplicates?: Array<{ isbn: string; titulo?: string }>
    notFound?: Array<{ imageName: string }>
    googleErrors?: Array<{ isbn: string }>
    errors?: Array<{ imageName: string }>
  } | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetch('/api/admin/espacios')
      .then((r) => r.json())
      .then(setEspacios)
      .catch(() => {})
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedImages(files)
    setError('')
    setResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedImages.length) {
      setError('Por favor selecciona al menos una imagen')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      selectedImages.forEach((image) => {
        formData.append('images', image)
      })
      if (espacioId) formData.append('espacio_id', espacioId)

      const response = await fetch('/api/register-books', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = 'Error al registrar libros'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = response.statusText || `Error ${response.status}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setResult(data)
      setSelectedImages([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-2xl mx-auto">
      {/* Upload Zone */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6"
      >
        <label
          className={cn(
            'relative flex flex-col items-center justify-center w-full h-64 rounded-[2.5rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden group',
            selectedImages.length > 0
              ? 'border-violet-400 bg-violet-50'
              : 'border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-violet-300'
          )}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10 text-center px-4">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud
                size={32}
                className={selectedImages.length > 0 ? 'text-violet-600' : 'text-stone-400'}
              />
            </div>

            {selectedImages.length > 0 ? (
              <>
                <p className="mb-1 text-lg font-bold text-violet-900">{selectedImages.length} imágenes listas</p>
                <p className="text-sm text-violet-600 font-medium">Toca para cambiar</p>
              </>
            ) : (
              <>
                <p className="mb-1 text-lg font-bold text-slate-700">Sube fotos de los códigos de barra</p>
                <p className="text-sm text-slate-400 font-medium max-w-xs">
                  Puedes seleccionar varias fotos a la vez para carga masiva
                </p>
              </>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
          />
        </label>

        {/* Selector de espacio */}
        {espacios.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-violet-500" />
              Espacio físico
            </label>
            <select
              value={espacioId}
              onChange={(e) => setEspacioId(e.target.value)}
              className="w-full h-12 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
            >
              <option value="">Sin espacio asignado</option>
              {espacios.map((e) => (
                <option
                  key={e.id}
                  value={e.id}
                >
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button
          type="submit"
          disabled={!selectedImages.length || loading}
          className="h-14 rounded-2xl text-lg font-bold shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all bg-slate-900 text-white hover:bg-black"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Procesando Inteligencia...
            </>
          ) : (
            'Iniciar Carga Masiva'
          )}
        </Button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 animate-in shake">
          <XCircle className="shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-2xl font-black text-slate-800 tracking-tight px-2">Resultados</h3>

          {/* Success */}
          {result.registered && result.registered.length > 0 && (
            <div className="bg-green-50 rounded-[2rem] p-6 border border-green-100">
              <div className="flex items-center gap-3 mb-4 text-green-700">
                <CheckCircle2 className="h-6 w-6" />
                <h4 className="font-bold text-lg">Registrados ({result.registered.length})</h4>
              </div>
              <ul className="space-y-2">
                {result.registered.map((book) => (
                  <li
                    key={book.isbn}
                    className="bg-white/60 p-3 rounded-xl text-sm font-medium text-green-900 flex justify-between items-center"
                  >
                    <span>{book.titulo}</span>
                    <span className="text-green-600/70 text-xs font-mono">{book.isbn}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Duplicates */}
          {result.duplicates && result.duplicates.length > 0 && (
            <div className="bg-yellow-50 rounded-[2rem] p-6 border border-yellow-100">
              <div className="flex items-center gap-3 mb-4 text-yellow-700">
                <AlertTriangle className="h-6 w-6" />
                <h4 className="font-bold text-lg">Duplicados ({result.duplicates.length})</h4>
              </div>
              <ul className="space-y-2">
                {result.duplicates.map((book, idx) => (
                  <li
                    key={idx}
                    className="bg-white/60 p-3 rounded-xl text-sm font-medium text-yellow-900 flex justify-between items-center"
                  >
                    <span>{book.titulo || 'Libro desconocido'}</span>
                    <span className="text-yellow-700/70 text-xs font-mono">{book.isbn}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Errors Grid */}
          {result.notFound?.length || result.errors?.length ? (
            <div className="bg-red-50 rounded-[2rem] p-6 border border-red-100">
              <div className="flex items-center gap-3 mb-4 text-red-700">
                <XCircle className="h-6 w-6" />
                <h4 className="font-bold text-lg">Fallidos</h4>
              </div>
              <div className="flex flex-col gap-2">
                {result.notFound?.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white/60 p-3 rounded-xl flex items-center gap-2 text-red-900 text-sm"
                  >
                    <FileImage
                      size={14}
                      className="opacity-50"
                    />
                    <span className="font-medium">Sin ISBN: {item.imageName}</span>
                  </div>
                ))}
                {result.errors?.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white/60 p-3 rounded-xl flex items-center gap-2 text-red-900 text-sm"
                  >
                    <AlertTriangle
                      size={14}
                      className="opacity-50"
                    />
                    <span className="font-medium">Error: {item.imageName}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
