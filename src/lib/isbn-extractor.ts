import Anthropic from '@anthropic-ai/sdk'
import { isbnLogger } from './logger'

let anthropicClient: Anthropic | null = null

const MAX_RETRIES = 2
const MODEL = 'claude-haiku-4-5'

function getAnthropicClient() {
  if (anthropicClient) return anthropicClient
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  anthropicClient = new Anthropic({ apiKey, maxRetries: MAX_RETRIES })
  return anthropicClient
}

/**
 * Optimiza la imagen antes de enviarla a Claude para reducir tokens y costo.
 */
async function optimizeImage(image: File): Promise<string> {
  const bytes = await image.arrayBuffer()
  const buffer = Buffer.from(bytes)

  try {
    const sharp = (await import('sharp')).default
    const optimizedBuffer = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer()
    return optimizedBuffer.toString('base64')
  } catch (err) {
    isbnLogger.warn({ err }, 'sharp not available, sending raw image')
    return buffer.toString('base64')
  }
}

export async function extractISBNFromImage(image: File): Promise<string> {
  const client = getAnthropicClient()
  if (!client) {
    isbnLogger.error('Anthropic client not configured — set ANTHROPIC_API_KEY')
    return 'NOT_FOUND'
  }

  // Validar tipo de archivo
  if (!image.type.startsWith('image/')) {
    isbnLogger.error({ fileType: image.type }, 'Invalid file type')
    return 'NOT_FOUND'
  }

  // Validar tamaño (máx 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024
  if (image.size > MAX_FILE_SIZE) {
    isbnLogger.error({ fileSize: image.size }, 'File too large')
    return 'NOT_FOUND'
  }

  try {
    const base64Image = await optimizeImage(image)

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: 'Extract the ISBN barcode number from this image. Return ONLY the numeric ISBN code (10 or 13 digits), nothing else. If you cannot find an ISBN, return "NOT_FOUND".',
            },
          ],
        },
      ],
    })

    const result =
      response.content[0]?.type === 'text'
        ? response.content[0].text.trim()
        : 'NOT_FOUND'

    if (result !== 'NOT_FOUND') {
      isbnLogger.info({ isbn: result, model: MODEL, method: 'claude-haiku' }, 'ISBN extracted successfully')
    } else {
      isbnLogger.warn({ model: MODEL }, 'Claude could not find ISBN in image')
    }

    return result
  } catch (error) {
    isbnLogger.error(
      { err: error instanceof Error ? error.message : error },
      'Error extracting ISBN with Claude'
    )
    return 'NOT_FOUND'
  }
}
