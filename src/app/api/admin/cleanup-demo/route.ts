import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

// Lista de ISBNs usados en los mocks antiguos del perfil de usuario
const MOCK_ISBNS = [
  '978-0142437230',
  '978-0451524935',
  '9780061120084',
  '978-0345339706',
  '978-0747532743',
  '978-0140449136',
  '978-0307474728',
  '978-0141439518',
  '978-0679783268',
  '978-0307277671',
]

function getBorrowerLabel(email: string, fullName: string | undefined | null) {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedName = typeof fullName === 'string' ? fullName.trim() : ''
  return normalizedName || normalizedEmail
}

export async function POST(request: Request) {
  // Requiere admin app-level y usa service role para operar con seguridad
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const confirm = url.searchParams.get('confirm')
  const personaParam = url.searchParams.get('persona')
  const scope = url.searchParams.get('scope') || 'loans' // 'loans' | 'both' | 'books'

  if (confirm !== 'YES') {
    return NextResponse.json(
      {
        error: 'Acción protegida. Añade ?confirm=YES para ejecutar.',
        hint: 'Opcionales: persona=<label>, scope=loans|books|both',
        sample: '/api/admin/cleanup-demo?confirm=YES&persona=jerson&scope=loans',
      },
      { status: 400 }
    )
  }

  const admin = createSupabaseAdminClient()

  // Determinar persona objetivo
  const persona =
    personaParam && personaParam.trim()
      ? personaParam.trim()
      : getBorrowerLabel(auth.user.email!, auth.user.user_metadata?.full_name)

  let deletedLoans = 0
  let deletedBooks = 0

  try {
    if (scope === 'loans' || scope === 'both') {
      const { data: loansData, error: delLoansError } = await admin
        .from('prestamos')
        .delete()
        .in('libro_isbn', MOCK_ISBNS)
        .eq('persona', persona)
        .select('*')

      if (delLoansError) throw delLoansError
      deletedLoans = loansData?.length || 0
    }

    if (scope === 'books' || scope === 'both') {
      const { data: booksData, error: delBooksError } = await admin
        .from('libros')
        .delete()
        .in('isbn', MOCK_ISBNS)
        .select('*')

      if (delBooksError) throw delBooksError
      deletedBooks = booksData?.length || 0
    }

    return NextResponse.json({ ok: true, persona, deletedLoans, deletedBooks, scope })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

