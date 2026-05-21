import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const body = await request.json() as { titulo?: string; cantidad?: number }
  const cantidad = Math.min(Math.max(1, body.cantidad ?? 1), 50)
  const tituloBase = (body.titulo ?? 'Libro interno').trim()

  // Obtener el último ID interno para continuar la secuencia
  const { data: ultimoLibro } = await auth.supabase
    .from('libros')
    .select('isbn')
    .like('isbn', 'LVL-%')
    .order('isbn', { ascending: false })
    .limit(1)
    .single()

  let ultimoNumero = 0
  if (ultimoLibro?.isbn) {
    const match = ultimoLibro.isbn.match(/LVL-(\d+)/)
    if (match) ultimoNumero = parseInt(match[1], 10)
  }

  const qrs: { isbn: string; titulo: string; qrDataUrl: string }[] = []

  for (let i = 0; i < cantidad; i++) {
    ultimoNumero++
    const isbn = `LVL-${String(ultimoNumero).padStart(4, '0')}`
    const titulo = cantidad > 1 ? `${tituloBase} (copia ${i + 1})` : tituloBase

    const qrDataUrl = await QRCode.toDataURL(isbn, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2,
    })

    qrs.push({ isbn, titulo, qrDataUrl })
  }

  return NextResponse.json({ qrs })
}
