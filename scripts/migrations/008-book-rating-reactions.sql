-- ================================================
-- TABLA: book_rating_reactions (reacciones a calificaciones de libros)
-- ================================================
-- Permite que usuarios reaccionen a calificaciones con like o love

CREATE TABLE IF NOT EXISTS public.book_rating_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_rating_id UUID NOT NULL REFERENCES public.book_ratings(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('like', 'love')),
  fecha_creacion TIMESTAMP DEFAULT NOW(),

  -- Constraints: Un usuario solo puede tener una reacción por rating
  UNIQUE(book_rating_id, usuario_id)
);

-- ================================================
-- ÍNDICES para queries rápidas
-- ================================================
CREATE INDEX IF NOT EXISTS idx_book_rating_reactions_book_rating_id
  ON public.book_rating_reactions(book_rating_id);

CREATE INDEX IF NOT EXISTS idx_book_rating_reactions_usuario_id
  ON public.book_rating_reactions(usuario_id);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Habilitar RLS
ALTER TABLE public.book_rating_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Cualquier usuario autenticado puede ver todas las reacciones
CREATE POLICY "select_all_reactions" ON public.book_rating_reactions
  FOR SELECT
  USING (true);

-- Policy: Los usuarios solo pueden insertar sus propias reacciones
CREATE POLICY "insert_own_reactions" ON public.book_rating_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Policy: Los usuarios solo pueden eliminar sus propias reacciones
CREATE POLICY "delete_own_reactions" ON public.book_rating_reactions
  FOR DELETE
  USING (auth.uid() = usuario_id);

-- Policy: Los usuarios solo pueden actualizar sus propias reacciones
CREATE POLICY "update_own_reactions" ON public.book_rating_reactions
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- ================================================
-- PERMISOS PARA USUARIOS AUTENTICADOS
-- ================================================
GRANT SELECT ON public.book_rating_reactions TO authenticated;
GRANT INSERT ON public.book_rating_reactions TO authenticated;
GRANT UPDATE ON public.book_rating_reactions TO authenticated;
GRANT DELETE ON public.book_rating_reactions TO authenticated;
