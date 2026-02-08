-- ================================================
-- SCHEMA INICIAL PARA LEEPE (Sistema de Préstamos de Libros)
-- ================================================
-- Este script crea todas las tablas, índices y políticas RLS necesarias
-- para el sistema de gestión de préstamos de libros de La Victoria Lab

-- ================================================
-- 1. TABLA: libros (inventario de libros)
-- ================================================
CREATE TABLE IF NOT EXISTS public.libros (
  isbn TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  autores TEXT[],
  descripcion TEXT,
  thumbnail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para libros
CREATE INDEX IF NOT EXISTS idx_libros_titulo ON public.libros(titulo);
CREATE INDEX IF NOT EXISTS idx_libros_created_at ON public.libros(created_at DESC);

-- ================================================
-- 2. TABLA: prestamos (registro de préstamos)
-- ================================================
CREATE TABLE IF NOT EXISTS public.prestamos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  libro_isbn TEXT NOT NULL REFERENCES public.libros(isbn) ON DELETE CASCADE,
  persona TEXT NOT NULL, -- email o nombre de quien pidió prestado
  fecha_prestamo TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  fecha_devolucion TIMESTAMP WITH TIME ZONE,
  devuelto BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para prestamos
CREATE INDEX IF NOT EXISTS idx_prestamos_libro_isbn ON public.prestamos(libro_isbn);
CREATE INDEX IF NOT EXISTS idx_prestamos_devuelto ON public.prestamos(devuelto);
CREATE INDEX IF NOT EXISTS idx_prestamos_persona ON public.prestamos(persona);
CREATE INDEX IF NOT EXISTS idx_prestamos_fecha_prestamo ON public.prestamos(fecha_prestamo DESC);

-- ================================================
-- 3. VISTA: libros_estado (estado actual de libros)
-- ================================================
-- Esta vista combina información del inventario con el estado de préstamo
CREATE OR REPLACE VIEW public.libros_estado AS
SELECT 
  l.isbn,
  l.titulo,
  l.autores,
  l.descripcion,
  l.thumbnail,
  l.created_at,
  l.updated_at,
  COALESCE(p.devuelto, true) AS disponible,
  p.persona AS prestado_a,
  p.fecha_prestamo,
  p.id AS prestamo_id
FROM public.libros l
LEFT JOIN LATERAL (
  SELECT id, persona, fecha_prestamo, devuelto
  FROM public.prestamos
  WHERE libro_isbn = l.isbn
    AND devuelto = false
  ORDER BY fecha_prestamo DESC
  LIMIT 1
) p ON true;

-- ================================================
-- 4. FUNCIONES: Actualizar timestamps automáticamente
-- ================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para auto-actualizar updated_at
DROP TRIGGER IF EXISTS update_libros_updated_at ON public.libros;
CREATE TRIGGER update_libros_updated_at
  BEFORE UPDATE ON public.libros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_prestamos_updated_at ON public.prestamos;
CREATE TRIGGER update_prestamos_updated_at
  BEFORE UPDATE ON public.prestamos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.libros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;

-- Políticas para libros
-- Los usuarios con email @lavictoria.pe pueden leer todos los libros
CREATE POLICY "Usuarios de lavictoria.pe pueden leer libros"
  ON public.libros
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' LIKE '%@lavictoria.pe'
  );

-- Solo admins pueden insertar/actualizar/eliminar libros
CREATE POLICY "Solo admins pueden modificar libros"
  ON public.libros
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('fabio@lavictoria.pe')
  )
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('fabio@lavictoria.pe')
  );

-- Políticas para prestamos
-- Los usuarios de lavictoria.pe pueden leer todos los préstamos
CREATE POLICY "Usuarios de lavictoria.pe pueden leer prestamos"
  ON public.prestamos
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' LIKE '%@lavictoria.pe'
  );

-- Los usuarios de lavictoria.pe pueden crear préstamos
CREATE POLICY "Usuarios de lavictoria.pe pueden crear prestamos"
  ON public.prestamos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' LIKE '%@lavictoria.pe'
  );

-- Los usuarios de lavictoria.pe pueden actualizar préstamos (para devolverlos)
CREATE POLICY "Usuarios de lavictoria.pe pueden actualizar prestamos"
  ON public.prestamos
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' LIKE '%@lavictoria.pe'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' LIKE '%@lavictoria.pe'
  );

-- Solo admins pueden eliminar préstamos
CREATE POLICY "Solo admins pueden eliminar prestamos"
  ON public.prestamos
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('fabio@lavictoria.pe')
  );

-- ================================================
-- 6. GRANTS (permisos)
-- ================================================
-- Dar permisos a usuarios autenticados
GRANT SELECT ON public.libros TO authenticated;
GRANT SELECT ON public.prestamos TO authenticated;
GRANT SELECT ON public.libros_estado TO authenticated;

-- Service role tiene permisos completos (usado por scripts)
GRANT ALL ON public.libros TO service_role;
GRANT ALL ON public.prestamos TO service_role;

-- ================================================
-- FIN DEL SCRIPT
-- ================================================

-- Verificación: Listar todas las tablas creadas
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificación: Listar todas las vistas creadas
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;
