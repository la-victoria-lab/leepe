-- Tabla para reacciones a ratings (likes y me encanta)
CREATE TABLE IF NOT EXISTS book_rating_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_rating_id UUID NOT NULL REFERENCES book_ratings(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('like', 'love')),
  fecha_creacion TIMESTAMP DEFAULT NOW(),

  UNIQUE(book_rating_id, usuario_id)
);

-- Índices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_reactions_rating ON book_rating_reactions(book_rating_id);
CREATE INDEX IF NOT EXISTS idx_reactions_usuario ON book_rating_reactions(usuario_id);

-- RLS Policy: Usuarios autenticados pueden ver todas las reacciones
ALTER TABLE book_rating_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all reactions" ON book_rating_reactions;
DROP POLICY IF EXISTS "Users can create own reactions" ON book_rating_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON book_rating_reactions;
DROP POLICY IF EXISTS "Users can update own reactions" ON book_rating_reactions;

-- Create policies
CREATE POLICY "Users can view all reactions" ON book_rating_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can create own reactions" ON book_rating_reactions
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can delete own reactions" ON book_rating_reactions
  FOR DELETE USING (auth.uid() = usuario_id);

CREATE POLICY "Users can update own reactions" ON book_rating_reactions
  FOR UPDATE USING (auth.uid() = usuario_id);

-- Grant access
GRANT SELECT ON book_rating_reactions TO authenticated;
GRANT INSERT ON book_rating_reactions TO authenticated;
GRANT DELETE ON book_rating_reactions TO authenticated;
GRANT UPDATE ON book_rating_reactions TO authenticated;
