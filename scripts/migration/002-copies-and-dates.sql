-- ================================================
-- MIGRACIÓN 002: Copias múltiples + Fechas de devolución
-- ================================================

-- 1. Agregar copias_total a libros
ALTER TABLE public.libros
  ADD COLUMN IF NOT EXISTS copias_total INTEGER DEFAULT 1 NOT NULL;

-- 2. Agregar fecha_limite a prestamos
ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS fecha_limite TIMESTAMP WITH TIME ZONE;

-- 3. Rellenar fecha_limite en préstamos existentes
UPDATE public.prestamos
  SET fecha_limite = fecha_prestamo + INTERVAL '14 days'
  WHERE fecha_limite IS NULL;

-- 4. Índice para vencimientos
CREATE INDEX IF NOT EXISTS idx_prestamos_fecha_limite
  ON public.prestamos(fecha_limite)
  WHERE devuelto = false;

-- 5. Recrear vista (DROP primero para evitar conflicto de columnas)
DROP VIEW IF EXISTS public.libros_estado;

CREATE VIEW public.libros_estado
WITH (security_invoker = true)
AS
SELECT
  l.isbn,
  l.titulo,
  l.autores,
  l.descripcion,
  l.thumbnail,
  l.created_at,
  l.updated_at,
  l.copias_total,
  GREATEST(0, l.copias_total - COALESCE(al.prestadas, 0))  AS copias_disponibles,
  CASE WHEN GREATEST(0, l.copias_total - COALESCE(al.prestadas, 0)) > 0
       THEN true ELSE false END                             AS disponible,
  al.personas_con_libro                                     AS prestado_a,
  al.ultimo_prestamo_id                                     AS prestamo_id,
  al.ultima_fecha_prestamo                                  AS fecha_prestamo
FROM public.libros l
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int                AS prestadas,
    array_agg(persona)           AS personas_con_libro,
    MAX(id::text)                AS ultimo_prestamo_id,
    MAX(fecha_prestamo)          AS ultima_fecha_prestamo
  FROM public.prestamos
  WHERE libro_isbn = l.isbn
    AND devuelto = false
) al ON true;

-- 6. Restaurar permisos en la vista
GRANT SELECT ON public.libros_estado TO authenticated;
GRANT SELECT ON public.libros_estado TO service_role;
