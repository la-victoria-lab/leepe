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

  // Formato bonito en desarrollo
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,

  // Metadata base
  base: {
    env: process.env.NODE_ENV,
  },

  // Serializers para objetos comunes
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
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
