-- Tabla para guardar calificaciones de libros
CREATE TABLE book_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id UUID NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comentario TEXT,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW(),

  UNIQUE(prestamo_id) -- Un rating por préstamo
);

-- Índices para queries rápidas
CREATE INDEX idx_book_ratings_usuario ON book_ratings(usuario_id);
CREATE INDEX idx_book_ratings_prestamo ON book_ratings(prestamo_id);

-- Tabla de agregados: rating promedio por libro (desnormalizada para queries rápidas)
CREATE TABLE libro_rating_stats (
  isbn VARCHAR(13) PRIMARY KEY REFERENCES libros(isbn) ON DELETE CASCADE,
  promedio_rating NUMERIC(3,2) DEFAULT 0,
  total_ratings INT DEFAULT 0,
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- Función para actualizar estadísticas de rating
CREATE OR REPLACE FUNCTION actualizar_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se inserta o actualiza un rating, actualizar las estadísticas del libro
  WITH libro_ratings AS (
    SELECT
      p.libro_isbn,
      AVG(br.rating)::NUMERIC(3,2) as promedio,
      COUNT(br.id)::INT as total
    FROM book_ratings br
    JOIN prestamos p ON br.prestamo_id = p.id
    WHERE p.libro_isbn = COALESCE(NEW.libro_isbn, OLD.libro_isbn)
    GROUP BY p.libro_isbn
  )
  INSERT INTO libro_rating_stats (isbn, promedio_rating, total_ratings, fecha_actualizacion)
  SELECT libro_isbn, promedio, total, NOW() FROM libro_ratings
  ON CONFLICT (isbn) DO UPDATE SET
    promedio_rating = EXCLUDED.promedio_rating,
    total_ratings = EXCLUDED.total_ratings,
    fecha_actualizacion = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar estadísticas cuando se crea/actualiza un rating
CREATE TRIGGER trigger_actualizar_rating_stats
AFTER INSERT OR UPDATE ON book_ratings
FOR EACH ROW
EXECUTE FUNCTION actualizar_rating_stats();

-- Dar permisos a usuarios autenticados
GRANT SELECT ON book_ratings TO authenticated;
GRANT INSERT ON book_ratings TO authenticated;
GRANT UPDATE ON book_ratings TO authenticated;
GRANT SELECT ON libro_rating_stats TO authenticated;
