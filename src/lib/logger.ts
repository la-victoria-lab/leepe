import pino from 'pino'

/**
 * Logger estructurado usando Pino
 *
 * Uso:
 * logger.info({ userId: '123', action: 'book_lent' }, 'Book lent successfully')
 * logger.error({ error: err.message }, 'Failed to process request')
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // Sin transport en Next.js (los workers causan problemas)
  // El output JSON se puede procesar después si es necesario

  // Metadata base
  base: {
    env: process.env.NODE_ENV,
  },

  // Serializers para objetos comunes
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },

  // Formato básico para el navegador
  browser: {
    asObject: process.env.NODE_ENV === 'development',
  }
})

/**
 * Logger específico para APIs
 */
export const apiLogger = logger.child({ module: 'api' })

/**
 * Logger específico para autenticación
 */
export const authLogger = logger.child({ module: 'auth' })

/**
 * Logger específico para procesamiento de ISBN
 */
export const isbnLogger = logger.child({ module: 'isbn' })
