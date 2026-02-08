import { NextRequest, NextResponse } from 'next/server';

import { extractISBNFromImage } from '@/lib/isbn-extractor';
import { requireCompanyUser } from '@/lib/api-auth';

function getBorrowerLabel(email: string, fullName: string | undefined | null) {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedName = typeof fullName === 'string' ? fullName.trim() : ''
  return normalizedName || normalizedEmail
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCompanyUser()
    if (!auth.ok) return auth.response

    const contentType = request.headers.get('content-type') || ''
    const borrower = getBorrowerLabel(auth.user.email!, auth.user.user_metadata?.full_name)
    let isbn = ''

    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { isbn?: string }
      isbn = (body?.isbn || '').trim()
    } else {
      const formData = await request.formData();
      const image = formData.get('image') as File;

      if (!image) {
        return NextResponse.json(
          { error: 'Se requiere isbn o imagen' },
          { status: 400 }
        );
      }

      isbn = await extractISBNFromImage(image);
    }

    if (!isbn) {
      return NextResponse.json(
        { error: 'Se requiere isbn o imagen' },
        { status: 400 }
      );
    }

    if (isbn === 'NOT_FOUND') {
      return NextResponse.json(
        { error: 'No se encontró código ISBN en la imagen' },
        { status: 404 }
      );
    }

    // Check if book exists in inventory
    const { data: libro, error: libroError } = await auth.supabase
      .from('libros')
      .select('*')
      .eq('isbn', isbn)
      .single();

    if (libroError || !libro) {
      return NextResponse.json(
        { error: 'Libro no encontrado en el inventario. Por favor regístralo primero.' },
        { status: 404 }
      );
    }

    // Check if book is already lent
    const { data: activePrestamo } = await auth.supabase
      .from('prestamos')
      .select('*')
      .eq('libro_isbn', isbn)
      .eq('devuelto', false)
      .single();

    if (activePrestamo) {
      return NextResponse.json(
        { error: `El libro ya está prestado a ${activePrestamo.persona}` },
        { status: 400 }
      );
    }

    // Create loan record
    const { data: prestamo, error: prestamoError } = await auth.supabase
      .from('prestamos')
      .insert({
        libro_isbn: isbn,
        persona: borrower,
      })
      .select()
      .single();

    if (prestamoError) {
      console.error('[lend-book] Database error:', prestamoError);
      return NextResponse.json(
        { error: 'Error al registrar el préstamo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Libro prestado exitosamente',
      prestamo,
      libro,
    });
  } catch (error) {
    console.error('[lend-book] Error:', error);
    return NextResponse.json(
      { error: 'Error al prestar el libro' },
      { status: 500 }
    );
  }
}
