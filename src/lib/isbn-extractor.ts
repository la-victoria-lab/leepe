import OpenAI from 'openai'
import sharp from 'sharp'
import { isbnLogger } from './logger'

let openaiClient: OpenAI | null = null

// Configuración
const MAX_RETRIES = 2
const TIMEOUT_MS = 30000 // 30 segundos

function getOpenAIClient() {
  if (openaiClient) return openaiClient
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  openaiClient = new OpenAI({
    apiKey,
    timeout: TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  })
  return openaiClient
}

/**
 * Optimiza una imagen redimensionándola y comprimiéndola antes de enviarla a OpenAI
 * Esto reduce significativamente los costos de la API
 */
async function optimizeImage(image: File): Promise<string> {
  const bytes = await image.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Redimensionar y comprimir la imagen
  const optimizedBuffer = await sharp(buffer)
    .resize(800, 800, {
      fit: 'inside', // Mantener aspect ratio
      withoutEnlargement: true, // No agrandar imágenes pequeñas
    })
    .jpeg({
      quality: 80, // Buena calidad, buen tamaño
      mozjpeg: true, // Usar mozjpeg para mejor compresión
    })
    .toBuffer()

  return optimizedBuffer.toString('base64')
}

export async function extractISBNFromImage(image: File): Promise<string> {
  const openai = getOpenAIClient()
  if (!openai) {
    isbnLogger.error('OpenAI client not configured')
    return 'NOT_FOUND'
  }

  try {
    // Validar tipo de archivo
    if (!image.type.startsWith('image/')) {
      isbnLogger.error({ fileType: image.type }, 'Invalid file type')
      return 'NOT_FOUND'
    }

    // Validar tamaño de archivo (máx 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (image.size > MAX_FILE_SIZE) {
      isbnLogger.error({ fileSize: image.size, maxSize: MAX_FILE_SIZE }, 'File too large')
      return 'NOT_FOUND'
    }

    // Optimizar imagen antes de enviar
    const base64Image = await optimizeImage(image)

    // Llamada a OpenAI con timeout y retries configurados
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract the ISBN barcode number from this image. Return ONLY the numeric ISBN code (10 or 13 digits), nothing else. If you cannot find an ISBN, return "NOT_FOUND".',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 100,
      temperature: 0, // Más determinístico para extracción de datos
    })

    const result = response.choices[0]?.message?.content?.trim() || 'NOT_FOUND'

    // Log para debugging
    if (result !== 'NOT_FOUND') {
      isbnLogger.info({ isbn: result }, 'ISBN extracted successfully')
    }

    return result
  } catch (error) {
    // Manejo detallado de errores
    if (error instanceof Error) {
      isbnLogger.error(
        {
          err: error,
          message: error.message,
          name: error.name,
        },
        'Error extracting ISBN'
      )

      // Errores específicos de OpenAI
      if ('status' in error) {
        const statusCode = (error as { status: number }).status
        isbnLogger.error({ statusCode }, 'OpenAI API error')
      }
    } else {
      isbnLogger.error({ error }, 'Unknown error')
    }

    return 'NOT_FOUND'
  }
}
