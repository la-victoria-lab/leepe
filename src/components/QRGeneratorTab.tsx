'use client'

import { useState } from 'react'
import { QrCode, Printer, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type QRItem = {
  isbn: string
  titulo: string
  qrDataUrl: string
}

export default function QRGeneratorTab() {
  const [titulo, setTitulo] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [loading, setLoading] = useState(false)
  const [qrs, setQrs] = useState<QRItem[]>([])
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!titulo.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, cantidad }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error generando QR')
      setQrs(data.qrs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Libros Internos - LEE(PE)</title>
        <style>
          body { font-family: sans-serif; margin: 20px; }
          .grid { display: flex; flex-wrap: wrap; gap: 20px; }
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            width: 160px;
            page-break-inside: avoid;
          }
          img { width: 120px; height: 120px; }
          .isbn { font-weight: 900; font-size: 13px; color: #1e293b; margin: 6px 0 2px; }
          .titulo { font-size: 11px; color: #64748b; line-clamp: 2; }
          h1 { font-size: 18px; margin-bottom: 16px; color: #1e293b; }
          @media print { body { margin: 10px; } }
        </style>
      </head>
      <body>
        <h1>📚 LEE(PE) — Libros Internos</h1>
        <div class="grid">
          ${qrs.map((q) => `
            <div class="card">
              <img src="${q.qrDataUrl}" alt="${q.isbn}" />
              <div class="isbn">${q.isbn}</div>
              <div class="titulo">${q.titulo}</div>
            </div>
          `).join('')}
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="hidden md:block">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">QR Libros Internos</h2>
        <p className="text-slate-500 font-medium">Genera códigos para libros sin ISBN publicado</p>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
            Nombre del libro
          </label>
          <Input
            placeholder="Ej: Manual de diseño interno LVL"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="rounded-xl"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
            Número de copias
          </label>
          <div className="flex items-center gap-3">
            <button
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-600 hover:bg-slate-200"
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            >−</button>
            <span className="text-xl font-black text-slate-800 w-8 text-center">{cantidad}</span>
            <button
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-600 hover:bg-slate-200"
              onClick={() => setCantidad((c) => Math.min(50, c + 1))}
            >+</button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>
        )}

        <Button
          onClick={handleGenerate}
          disabled={loading || !titulo.trim()}
          className="w-full rounded-xl bg-slate-900 text-white h-11 font-bold gap-2"
        >
          <QrCode size={18} />
          {loading ? 'Generando...' : 'Generar QR'}
        </Button>
      </div>

      {/* Resultados */}
      {qrs.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-700 text-sm uppercase tracking-wider">
              {qrs.length} código{qrs.length !== 1 ? 's' : ''} generado{qrs.length !== 1 ? 's' : ''}
            </h3>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="rounded-full gap-2 border-slate-200"
            >
              <Printer size={14} />
              Imprimir
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {qrs.map((q) => (
              <div
                key={q.isbn}
                className="border border-slate-100 rounded-xl p-3 text-center"
              >
                <img
                  src={q.qrDataUrl}
                  alt={q.isbn}
                  className="w-full aspect-square object-contain"
                />
                <p className="text-xs font-black text-slate-700 mt-2">{q.isbn}</p>
                <p className="text-[10px] text-slate-400 line-clamp-2">{q.titulo}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center">
            💡 Registra estos libros en el Catálogo usando el ISBN generado (ej: LVL-0001)
          </p>
        </div>
      )}
    </div>
  )
}
