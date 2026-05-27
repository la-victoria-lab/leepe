-- ================================================
-- MIGRACIÓN 004: Espacios + Permisos completos
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Es idempotente: segura de re-ejecutar
-- ================================================

-- 1. TABLA espacios (ubicaciones físicas de libros)
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.espacios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 2. libros.espacio_id (FK a espacios, opcional)
-- ------------------------------------------------
ALTER TABLE public.libros
  ADD COLUMN IF NOT EXISTS espacio_id UUID REFERENCES public.espacios(id) ON DELETE SET NULL;

-- 3. libros.copias_total (de migración 002, idempotente)
-- ------------------------------------------------
ALTER TABLE public.libros
  ADD COLUMN IF NOT EXISTS copias_total INTEGER DEFAULT 1 NOT NULL;

-- 4. prestamos.fecha_limite (de migración 002, idempotente)
-- ------------------------------------------------
ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS fecha_limite TIMESTAMP WITH TIME ZONE;

-- Rellenar fecha_limite en préstamos existentes sin fecha
UPDATE public.prestamos
  SET fecha_limite = fecha_prestamo + INTERVAL '14 days'
  WHERE fecha_limite IS NULL AND devuelto = false;

-- 5. Trigger para espacios.updated_at
-- ------------------------------------------------
DROP TRIGGER IF EXISTS update_espacios_updated_at ON public.espacios;
CREATE TRIGGER update_espacios_updated_at
  BEFORE UPDATE ON public.espacios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Índices
-- ------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_libros_espacio ON public.libros(espacio_id) WHERE espacio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prestamos_fecha_limite ON public.prestamos(fecha_limite) WHERE devuelto = false;

-- 7. RLS para espacios
-- ------------------------------------------------
ALTER TABLE public.espacios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins pueden gestionar espacios" ON public.espacios;
CREATE POLICY "Admins pueden gestionar espacios"
  ON public.espacios FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_emails ae WHERE ae.email = (auth.jwt() ->> 'email'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_emails ae WHERE ae.email = (auth.jwt() ->> 'email'))
  );

DROP POLICY IF EXISTS "Usuarios pueden leer espacios" ON public.espacios;
CREATE POLICY "Usuarios pueden leer espacios"
  ON public.espacios FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'email' LIKE '%@lavictoria.pe');

-- 8. Actualizar RLS de libros → usar admin_emails en lugar de email hardcodeado
-- ------------------------------------------------
DROP POLICY IF EXISTS "Solo admins pueden modificar libros" ON public.libros;
CREATE POLICY "Admins pueden modificar libros"
  ON public.libros FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_emails ae WHERE ae.email = (auth.jwt() ->> 'email'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_emails ae WHERE ae.email = (auth.jwt() ->> 'email'))
  );

-- 9. Actualizar RLS de préstamos → admins para eliminar
-- ------------------------------------------------
DROP POLICY IF EXISTS "Solo admins pueden eliminar prestamos" ON public.prestamos;
CREATE POLICY "Admins pueden eliminar prestamos"
  ON public.prestamos FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_emails ae WHERE ae.email = (auth.jwt() ->> 'email'))
  );

-- 10. Corregir GRANTs faltantes para operaciones de escritura
-- ------------------------------------------------
-- libros: admins escriben via API (la API verifica el rol)
GRANT INSERT, UPDATE, DELETE ON public.libros TO authenticated;

-- prestamos: usuarios @lavictoria.pe prestan/devuelven via API
GRANT INSERT, UPDATE ON public.prestamos TO authenticated;

-- espacios
GRANT SELECT, INSERT, UPDATE, DELETE ON public.espacios TO authenticated;
GRANT ALL ON public.espacios TO service_role;

-- 11. Recrear vista libros_estado con campo espacio_id
-- ------------------------------------------------
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

GRANT SELECT ON public.libros_estado TO authenticated;
GRANT SELECT ON public.libros_estado TO service_role;

-- ================================================
-- VERIFICACIÓN FINAL
-- ================================================
SELECT
  c.table_name,
  c.column_name,
  c.data_type
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN ('libros', 'prestamos', 'espacios', 'admin_emails')
ORDER BY c.table_name, c.ordinal_position;
