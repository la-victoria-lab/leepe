import { NextRequest, NextResponse } from 'next/server';
import { extractISBNFromImage } from '@/lib/isbn-extractor';
import { requireAdmin } from '@/lib/api-auth';
import { IsbnSchema, validateOrError, GoogleBookSchema } from '@/lib/validations';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const formData = await request.formData();
    const images = formData.getAll('images') as File[];

    if (!images.length) {
      return NextResponse.json(
        { error: 'No se proporcionaron imágenes' },
        { status: 400 }
      );
    }

    // Extract ISBNs from all images in parallel
    const isbnPromises = images.map(async (image) => {
      try {
        const isbn = await extractISBNFromImage(image);
        return {
          imageName: image.name,
          isbn,
          status: isbn === 'NOT_FOUND' ? 'no_isbn' : 'success',
        };
      } catch {
        return {
          imageName: image.name,
          isbn: null,
          status: 'error',
        };
      }
    });

    const results = await Promise.all(isbnPromises);
    const validResults = results.filter((r) => r.isbn && r.isbn !== 'NOT_FOUND');
    const validIsbns = validResults.map((r) => r.isbn!);

    // Validar formato de todos los ISBNs
    const invalidIsbns = validIsbns.filter((isbn) => {
      const validation = validateOrError(IsbnSchema, isbn)
      return !validation.success
    })

    if (invalidIsbns.length > 0) {
      return NextResponse.json({
        message: 'Some ISBNs have invalid format',
        invalidIsbns,
        registered: [],
        duplicates: [],
        notFound: results.filter((r) => r.status === 'no_isbn'),
        errors: results.filter((r) => r.status === 'error'),
      });
    }

    if (!validIsbns.length) {
      return NextResponse.json({
        message: 'No valid ISBNs found',
        registered: [],
        duplicates: [],
        notFound: results.filter((r) => r.status === 'no_isbn'),
        errors: results.filter((r) => r.status === 'error'),
      });
    }

    // Check for duplicates in database
    const { data: existingBooks } = await auth.supabase
      .from('libros')
      .select('isbn, titulo')
      .in('isbn', validIsbns);

    const existingMap = new Map(existingBooks?.map((b) => [b.isbn, b.titulo]) || []);
    const newIsbns = validIsbns.filter((isbn) => !existingMap.has(isbn));

    // Fetch book info from Google Books for new ISBNs
    const bookPromises = newIsbns.map(async (isbn) => {
      try {
        const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
        const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${apiKey ? `&key=${apiKey}` : ''}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || !data.items?.length) {
          return { isbn, status: 'not_found_in_google' };
        }

        const book = data.items[0].volumeInfo;

        const bookData = {
          isbn,
          titulo: book.title || 'N/A',
          autores: book.authors || null,
          descripcion: book.description || null,
          thumbnail: book.imageLinks?.thumbnail || null,
          status: 'success',
        };

        // Validar datos del libro antes de retornar
        const validation = validateOrError(GoogleBookSchema, {
          isbn: bookData.isbn,
          titulo: bookData.titulo,
          autores: bookData.autores,
          descripcion: bookData.descripcion,
          thumbnail: bookData.thumbnail,
        })

        if (!validation.success) {
          return { isbn, status: 'invalid_data' };
        }

        return bookData;
      } catch {
        return { isbn, status: 'google_error' };
      }
    });

    const bookResults = await Promise.all(bookPromises);
    const successfulBooks = bookResults.filter((b) => b.status === 'success');
    const failedGoogleBooks = bookResults.filter((b) => b.status !== 'success');

    // Insert books into database (remove status field)
    if (successfulBooks.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const booksToInsert = successfulBooks.map(({ status: _status, ...book }) => book);
      const { error: insertError } = await auth.supabase.from('libros').insert(booksToInsert);

      if (insertError) {
        apiLogger.error({ err: insertError, count: booksToInsert.length }, 'Database error inserting books');
        return NextResponse.json(
          { error: `Error al registrar libros: ${insertError.message || 'Error desconocido en la base de datos'}` },
          { status: 500 }
        );
      }

      apiLogger.info({ count: booksToInsert.length }, 'Books registered successfully');
    }

    return NextResponse.json({
      message: 'Processing complete',
      registered: successfulBooks,
      duplicates: Array.from(existingMap.entries()).map(([isbn, titulo]) => ({ isbn, titulo })),
      notFound: results.filter((r) => r.status === 'no_isbn'),
      errors: results.filter((r) => r.status === 'error'),
      googleErrors: failedGoogleBooks,
    });
  } catch (error) {
    apiLogger.error({ err: error }, 'Error processing register books request');
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: `Error al procesar la solicitud: ${errorMessage}` },
      { status: 500 }
    );
  }
}
