-- ================================================
-- MIGRACIÓN 003: Tabla de roles de administrador
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ================================================

CREATE TABLE IF NOT EXISTS public.admin_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Insertar admins actuales del .env
INSERT INTO public.admin_emails (email) VALUES
  ('jerson@lavictoria.pe'),
  ('fabio@lavictoria.pe')
ON CONFLICT (email) DO NOTHING;

-- RLS
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Solo admins (del .env) pueden leer y modificar
CREATE POLICY "Solo admins pueden gestionar roles"
  ON public.admin_emails
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = ANY(
    ARRAY(SELECT email FROM public.admin_emails)
  ));

-- Permisos
GRANT SELECT, INSERT, DELETE ON public.admin_emails TO authenticated;
GRANT ALL ON public.admin_emails TO service_role;
