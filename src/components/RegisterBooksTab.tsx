'use client';

import { useState } from 'react';

export default function RegisterBooksTab() {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    registered?: Array<{ isbn: string; titulo: string }>;
    duplicates?: Array<{ isbn: string; titulo?: string }>;
    notFound?: Array<{ imageName: string }>;
    googleErrors?: Array<{ isbn: string }>;
    errors?: Array<{ imageName: string }>;
  } | null>(null);
  const [error, setError] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(files);
    setError('');
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedImages.length) {
      setError('Por favor selecciona al menos una imagen');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      selectedImages.forEach((image) => {
        formData.append('images', image);
      });

      const response = await fetch('/api/register-books', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Error al registrar libros';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // si la respuesta no es JSON, usar el status text
          errorMessage = response.statusText || `Error ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setResult(data);
      setSelectedImages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 text-center">Registrar Libros</h2>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="cursor-pointer inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Seleccionar Imágenes
          </label>

          {selectedImages.length > 0 && (
            <div className="mt-4">
              <p className="text-gray-600">
                {selectedImages.length} imagen(es) seleccionada(s)
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!selectedImages.length || loading}
          className="mt-4 w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Procesando...' : 'Registrar Libros'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold mb-4">Resultado del Procesamiento</h3>

          {result.registered && result.registered.length > 0 && (
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                ✓ Libros registrados exitosamente ({result.registered.length})
              </h4>
              <ul className="space-y-1">
                {result.registered.map((book) => (
                  <li key={book.isbn} className="text-gray-700 text-sm">
                    • {book.titulo} <span className="text-gray-500">(ISBN: {book.isbn})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.duplicates && result.duplicates.length > 0 && (
            <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
              <h4 className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                ⚠ Ya estaban registrados ({result.duplicates.length})
              </h4>
              <ul className="space-y-1">
                {result.duplicates.map((book) => (
                  <li key={book.isbn} className="text-gray-700 text-sm">
                    • {book.titulo || `ISBN: ${book.isbn}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.notFound && result.notFound.length > 0 && (
            <div className="border rounded-lg p-4 bg-orange-50 border-orange-200">
              <h4 className="font-semibold text-orange-700 mb-2 flex items-center gap-2">
                ⊘ No se encontró ISBN en estas imágenes ({result.notFound.length})
              </h4>
              <ul className="space-y-1">
                {result.notFound.map((item, idx: number) => (
                  <li key={idx} className="text-gray-700 text-sm">
                    • {item.imageName}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.googleErrors && result.googleErrors.length > 0 && (
            <div className="border rounded-lg p-4 bg-red-50 border-red-200">
              <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                ✗ No encontrados en Google Books ({result.googleErrors.length})
              </h4>
              <ul className="space-y-1">
                {result.googleErrors.map((item) => (
                  <li key={item.isbn} className="text-gray-700 text-sm">
                    • ISBN: {item.isbn}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="border rounded-lg p-4 bg-red-50 border-red-200">
              <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                ✗ Errores al procesar ({result.errors.length})
              </h4>
              <ul className="space-y-1">
                {result.errors.map((item, idx: number) => (
                  <li key={idx} className="text-gray-700 text-sm">
                    • {item.imageName}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
