import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { data: books, error } = await auth.supabase.from('libros_estado').select('*').order('titulo')

    if (error) {
      console.error('[books] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 })
    }

    return NextResponse.json(books)
  } catch (error) {
    console.error('[books] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 })
  }
}
