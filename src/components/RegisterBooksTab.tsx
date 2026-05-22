'use client'

import { useState, useEffect } from 'react'
import { UploadCloud, CheckCircle2, AlertTriangle, XCircle, FileImage, Loader2, MapPin, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Intenta leer el código de barras de una imagen con ZBar WASM (client-side, gratis) */
async function scanImageForISBN(file: File): Promise<string | null> {
  try {
    const { scanImageData } = await import('@undecaf/zbar-wasm')
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const symbols = await scanImageData(imageData)
    if (symbols.length > 0) {
      const code = symbols[0].decode().trim()
      return code || null
    }
  } catch {
    // ZBar no disponible o falló — se usará Claude como fallback
  }
  return null
}

interface Espacio {
  id: string
  nombre: string
}

export default function RegisterBooksTab() {
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [espacios, setEspacios] = useState<Espacio[]>([])
  const [espacioId, setEspacioId] = useState<string>('')
  const [manualIsbn, setManualIsbn] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'foto' | 'manual'>('foto')
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

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault()
    const isbn = manualIsbn.trim().replace(/[-\s]/g, '')
    if (!isbn) { setError('Ingresa un ISBN'); return }
    if (!/^\d{10}(\d{3})?$/.test(isbn)) { setError('ISBN debe tener 10 o 13 dígitos'); return }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/register-books/manual', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isbn, espacio_id: espacioId || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setManualIsbn('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
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
      // 1. Intentar ZBar client-side en cada imagen primero
      const zbarResults = await Promise.all(
        selectedImages.map(async (img) => ({
          file: img,
          isbn: await scanImageForISBN(img),
        }))
      )

      const zbarFound = zbarResults.filter(r => r.isbn)
      const zbarMissed = zbarResults.filter(r => !r.isbn)

      // 2. Para los que ZBar encontró ISBN, registrar directamente
      let zbarRegistered: Array<{ isbn: string; titulo: string }> = []
      let zbarDuplicates: Array<{ isbn: string; titulo?: string }> = []
      const zbarErrors: Array<{ isbn: string }> = []

      for (const { isbn } of zbarFound) {
        try {
          const res = await fetch('/api/register-books/manual', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ isbn, espacio_id: espacioId || null }),
          })
          const data = await res.json()
          if (data.registered?.length) zbarRegistered = [...zbarRegistered, ...data.registered]
          if (data.duplicates?.length) zbarDuplicates = [...zbarDuplicates, ...data.duplicates]
        } catch {
          if (isbn) zbarErrors.push({ isbn })
        }
      }

      // 3. Para los que ZBar falló, enviar a Claude como fallback
      let claudeResult = { registered: [], duplicates: [], notFound: [], errors: [] } as {
        registered: Array<{ isbn: string; titulo: string }>
        duplicates: Array<{ isbn: string; titulo?: string }>
        notFound: Array<{ imageName: string }>
        errors: Array<{ imageName: string }>
      }

      if (zbarMissed.length > 0) {
        const formData = new FormData()
        zbarMissed.forEach(({ file }) => formData.append('images', file))
        if (espacioId) formData.append('espacio_id', espacioId)

        const response = await fetch('/api/register-books', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          claudeResult = await response.json()
        }
      }

      // 4. Combinar resultados de ZBar + Claude
      setResult({
        registered: [...zbarRegistered, ...(claudeResult.registered || [])],
        duplicates: [...zbarDuplicates, ...(claudeResult.duplicates || [])],
        notFound: claudeResult.notFound || [],
        errors: claudeResult.errors || [],
        googleErrors: zbarErrors.map(e => ({ isbn: e.isbn })),
      })
      setSelectedImages([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-2xl mx-auto">

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => { setActiveTab('foto'); setError(''); setResult(null) }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all',
            activeTab === 'foto' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <UploadCloud size={16} /> Foto / Imagen
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('manual'); setError(''); setResult(null) }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all',
            activeTab === 'manual' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Hash size={16} /> ISBN Manual
        </button>
      </div>

      {/* Manual ISBN form */}
      {activeTab === 'manual' && (
        <form onSubmit={handleSubmitManual} className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
            <p className="text-sm text-slate-500 font-medium">
              Ingresa el ISBN de la contratapa del libro (10 o 13 dígitos)
            </p>
            <Input
              placeholder="Ej: 9786123456789"
              value={manualIsbn}
              onChange={e => setManualIsbn(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmitManual(e as unknown as React.FormEvent)}
              className="rounded-xl text-lg font-mono tracking-wider h-12"
              inputMode="numeric"
            />
          </div>

          {/* Espacio */}
          {espacios.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-violet-500" /> Espacio físico
              </label>
              <select
                value={espacioId}
                onChange={e => setEspacioId(e.target.value)}
                className="w-full h-12 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Sin espacio asignado</option>
                {espacios.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          )}

          <Button
            type="submit"
            disabled={!manualIsbn.trim() || loading}
            className="h-14 rounded-2xl text-lg font-bold bg-slate-900 text-white hover:bg-black"
          >
            {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Buscando...</> : 'Registrar libro'}
          </Button>
        </form>
      )}

      {/* Upload Zone */}
      {activeTab === 'foto' && <form
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
      </form>}

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
