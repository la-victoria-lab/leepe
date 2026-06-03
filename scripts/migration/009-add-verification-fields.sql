-- Agregar campos para verificación de devoluciones
ALTER TABLE prestamos
ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_verificado TIMESTAMP DEFAULT NULL;

-- Crear índice para queries rápidas
CREATE INDEX IF NOT EXISTS idx_prestamos_verificado ON prestamos(verificado);
CREATE INDEX IF NOT EXISTS idx_prestamos_devuelto_verificado ON prestamos(devuelto, verificado);
