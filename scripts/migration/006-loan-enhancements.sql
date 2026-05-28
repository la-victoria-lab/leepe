-- ================================================
-- MIGRACIÓN 006: Mejoras de Préstamos
-- Agregar campos para tracking de renovaciones y emails
-- ================================================

-- 1. Agregar columnas a prestamos tabla
ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS renewal_count INT DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS email_borrowed_sent BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS email_reminder_sent BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS fecha_prestamo_original TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL;

-- 2. Crear índices para consultas de renovación y emails
CREATE INDEX IF NOT EXISTS idx_prestamos_renewal_count ON public.prestamos(renewal_count);
CREATE INDEX IF NOT EXISTS idx_prestamos_email_reminder_sent ON public.prestamos(email_reminder_sent) WHERE devuelto = false;
CREATE INDEX IF NOT EXISTS idx_prestamos_fecha_limite_reminder ON public.prestamos(fecha_limite) WHERE devuelto = false AND email_reminder_sent = false;

-- ================================================
-- VERIFICACIÓN FINAL
-- ================================================
SELECT
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'prestamos'
ORDER BY c.ordinal_position;
