import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const limitParam = Number(url.searchParams.get('limit') || '50')
  const cursor = url.searchParams.get('cursor') || ''

  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50

  let query = auth.supabase
    .from('libros')
    .select('isbn, titulo, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) {
    console.error('[registration-history] database error', error)
    return NextResponse.json({ error: 'failed to fetch registration history' }, { status: 500 })
  }

  const nextCursor = data?.length ? data[data.length - 1]?.created_at : null

  return NextResponse.json({
    items: data || [],
    nextCursor,
  })
}
