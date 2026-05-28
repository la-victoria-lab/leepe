-- ================================================
-- MIGRACIÓN 005: Corregir tipo de datos de autores
-- ================================================
-- El campo autores estaba definido como TEXT[] (array)
-- pero se envía como TEXT desde el formulario.
-- Este script cambia el tipo a TEXT para que coincida.

-- 1. Eliminar las vistas que dependen de autores
DROP VIEW IF EXISTS public.libros_estado;

-- 2. Crear columna temporal con el tipo correcto
ALTER TABLE public.libros ADD COLUMN autores_temp TEXT;

-- 3. Copiar datos convertidos del array a texto
UPDATE public.libros
SET autores_temp = CASE
  WHEN autores IS NULL THEN NULL
  WHEN array_length(autores, 1) = 0 THEN NULL
  ELSE array_to_string(autores, ', ')
END;

-- 4. Eliminar columna antigua
ALTER TABLE public.libros DROP COLUMN autores;

-- 5. Renombrar columna temporal
ALTER TABLE public.libros RENAME COLUMN autores_temp TO autores;

-- 6. Recrear la vista libros_estado
CREATE OR REPLACE VIEW public.libros_estado
WITH (security_invoker = true)
AS
SELECT
  l.isbn,
  l.titulo,
  l.autores,
  l.descripcion,
  l.thumbnail,
  l.espacio_id,
  l.copias_total,
  l.created_at,
  l.updated_at,
  GREATEST(0, l.copias_total - COALESCE(al.prestadas, 0)) AS copias_disponibles,
  CASE
    WHEN GREATEST(0, l.copias_total - COALESCE(al.prestadas, 0)) > 0 THEN true
    ELSE false
  END AS disponible,
  al.personas_con_libro AS prestado_a,
  al.ultimo_prestamo_id AS prestamo_id,
  al.ultima_fecha_prestamo AS fecha_prestamo
FROM public.libros l
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int              AS prestadas,
    array_agg(persona)         AS personas_con_libro,
    MAX(id::text)              AS ultimo_prestamo_id,
    MAX(fecha_prestamo)        AS ultima_fecha_prestamo
  FROM public.prestamos
  WHERE libro_isbn = l.isbn
    AND devuelto = false
) al ON true;

-- 7. Restaurar permisos en la vista
GRANT SELECT ON public.libros_estado TO authenticated;
GRANT SELECT ON public.libros_estado TO service_role;

-- ================================================
-- Verificación final
-- ================================================
SELECT
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'libros'
ORDER BY c.ordinal_position;
