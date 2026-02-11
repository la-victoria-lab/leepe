import { z } from 'zod'

/**
 * Valida que un string sea un ISBN válido (10 o 13 dígitos)
 */
export const IsbnSchema = z
  .string()
  .trim()
  .transform((val) => val.replace(/[-\s]/g, ''))
  .refine((val) => /^(\d{10}|\d{13})$/.test(val), 'ISBN debe tener 10 o 13 dígitos numéricos')

/**
 * Schema para validar múltiples ISBNs
 */
export const IsbnArraySchema = z.array(IsbnSchema).min(1, 'Debe proporcionar al menos un ISBN')

/**
 * Schema para validar datos de préstamo de libro
 */
export const LendBookSchema = z.object({
  isbn: IsbnSchema,
  userId: z.string().min(1, 'ID de usuario requerido'),
  userName: z.string().min(1, 'Nombre de usuario requerido').optional(),
})

/**
 * Schema para validar datos de devolución de libro
 */
export const ReturnBookSchema = z.object({
  loanId: z.string().uuid('ID de préstamo debe ser un UUID válido'),
})

/**
 * Schema para validar búsqueda de libros
 */
export const BookSearchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, 'Búsqueda no puede estar vacía')
    .max(200, 'Búsqueda no puede exceder 200 caracteres')
    .optional(),
  page: z
    .number()
    .int('Página debe ser un número entero')
    .positive('Página debe ser mayor a 0')
    .optional()
    .default(1),
  limit: z
    .number()
    .int('Límite debe ser un número entero')
    .positive('Límite debe ser mayor a 0')
    .max(100, 'Límite máximo es 100')
    .optional()
    .default(20),
})

/**
 * Schema para validar información de libro desde Google Books
 */
export const GoogleBookSchema = z.object({
  isbn: IsbnSchema,
  titulo: z.string().min(1, 'Título es requerido'),
  autores: z.array(z.string()).nullable().optional(),
  descripcion: z.string().nullable().optional(),
  thumbnail: z.string().url('URL de thumbnail inválida').nullable().optional(),
})

/**
 * Schema para validar archivos de imagen
 */
export const ImageFileSchema = z.object({
  type: z
    .string()
    .refine((type) => type.startsWith('image/'), 'El archivo debe ser una imagen'),
  size: z
    .number()
    .max(10 * 1024 * 1024, 'La imagen no puede exceder 10MB'),
  name: z.string().min(1, 'Nombre de archivo requerido'),
})

/**
 * Tipo helper para extraer el tipo TypeScript de un schema Zod
 */
export type LendBookInput = z.infer<typeof LendBookSchema>
export type ReturnBookInput = z.infer<typeof ReturnBookSchema>
export type BookSearchInput = z.infer<typeof BookSearchSchema>
export type GoogleBookData = z.infer<typeof GoogleBookSchema>

/**
 * Función helper para validar y retornar error formateado
 */
export function validateOrError<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  // Formatear errores de Zod
  const errorMessage = result.error.issues[0]?.message || 'Datos inválidos'
  return {
    success: false,
    error: errorMessage,
  }
}
