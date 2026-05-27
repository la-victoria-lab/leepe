-- ================================================
-- MIGRACIÓN 005: Corregir tipo de datos de autores
-- ================================================
-- El campo autores estaba definido como TEXT[] (array)
-- pero se envía como TEXT desde el formulario.
-- Este script cambia el tipo a TEXT para que coincida.

-- 1. Crear columna temporal con el tipo correcto
ALTER TABLE public.libros ADD COLUMN autores_temp TEXT;

-- 2. Copiar datos convertidos del array a texto
UPDATE public.libros
SET autores_temp = CASE
  WHEN autores IS NULL THEN NULL
  WHEN array_length(autores, 1) = 0 THEN NULL
  ELSE array_to_string(autores, ', ')
END;

-- 3. Eliminar columna antigua
ALTER TABLE public.libros DROP COLUMN autores;

-- 4. Renombrar columna temporal
ALTER TABLE public.libros RENAME COLUMN autores_temp TO autores;

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
