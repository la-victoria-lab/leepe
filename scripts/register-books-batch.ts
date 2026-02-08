#!/usr/bin/env bun

import { createSupabaseAdminClient } from '../src/lib/supabase-admin'
import { extractISBNFromImage } from '../src/lib/isbn-extractor'
import { readFile, writeFile, readdir, appendFile } from 'fs/promises'
import { existsSync, statSync } from 'fs'
import { join, extname } from 'path'
import { Jimp } from 'jimp'
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library'

// Configuración
const CONCURRENCY_LIMIT = 3 // Reducido para no saturar
const ERROR_LOG_FILE = 'error-books.txt'
const SUCCESS_LOG_FILE = 'processed-books.json'
const ZONES_DIR = 'books'

// 🧪 MODO PRUEBA: Si está en true, solo procesa las primeras TEST_LIMIT imágenes
const TEST_MODE = false
const TEST_LIMIT = 5 // Número de imágenes a procesar en modo prueba

// Configurar lector de código de barras con múltiples formatos
const hints = new Map()
// Agregar más formatos comunes de códigos de barra en libros
const formats = [
  BarcodeFormat.EAN_13, // Más común para ISBNs
  BarcodeFormat.EAN_8, // ISBN corto
  BarcodeFormat.CODE_128, // Usado en algunos libros
  BarcodeFormat.CODE_39, // Alternativa
]
hints.set(DecodeHintType.POSSIBLE_FORMATS, formats)
hints.set(DecodeHintType.TRY_HARDER, true)
const reader = new MultiFormatReader()
reader.setHints(hints)

interface BookResult {
  isbn: string
  titulo: string
  autores: string | null
  descripcion: string | null
  thumbnail: string | null
  image_path?: string // Cambiado a snake_case para BD
}

interface ProcessingResult {
  registered: BookResult[]
  fetched: BookResult[] // Libros obtenidos de Google pero pendiente de insert
  duplicates: Array<{ isbn: string; titulo?: string; imagePath?: string }>
  notFound: Array<{ imagePath: string }>
  googleErrors: Array<{ isbn: string; imagePath?: string }>
  errors: Array<{ imagePath: string; error: string }>
}

// Función para extraer ISBN localmente con mejor detección
async function extractISBNLocal(imagePath: string): Promise<string | null> {
  try {
    const image = await Jimp.read(imagePath)

    // Preprocesamiento para mejorar detección
    // 1. Redimensionar si es muy grande
    if (image.bitmap.width > 2000) {
      image.resize({ w: 2000 })
    }

    // Intentar detección con imagen original (o redimensionada)
    let isbn = decodeBitmap(image)
    if (isbn) return isbn

    // 2. Escala de grises y contraste
    const greyImage = image.clone().greyscale().contrast(0.4)
    isbn = decodeBitmap(greyImage)
    if (isbn) return isbn

    // 3. Probar con rotaciones (90, 180, 270 grados)
    for (const angle of [90, 180, 270]) {
      const rotated = image.clone().rotate({ deg: angle })
      isbn = decodeBitmap(rotated)
      if (isbn) return isbn

      // También probar rotación + escala de grises
      const rotatedGrey = rotated.greyscale().contrast(0.4)
      isbn = decodeBitmap(rotatedGrey)
      if (isbn) return isbn
    }

    // 4. Invertir colores (último recurso)
    const inverted = image.clone().invert()
    isbn = decodeBitmap(inverted)
    if (isbn) return isbn

    return null
  } catch {
    return null
  }
}

function decodeBitmap(image: any): string | null {
  try {
    const width = image.bitmap.width
    const height = image.bitmap.height
    const { data } = image.bitmap
    const uint8Clamped = new Uint8ClampedArray(data.buffer)
    const luminanceSource = new RGBLuminanceSource(uint8Clamped, width, height)
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource))
    const result = reader.decode(binaryBitmap)
    return result.getText()
  } catch {
    return null
  }
}

async function fetchBookFromGoogle(isbn: string, imagePath?: string): Promise<BookResult | null> {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${apiKey ? `&key=${apiKey}` : ''}`

    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok || !data.items?.length) {
      return null
    }

    const book = data.items[0].volumeInfo

    return {
      isbn,
      titulo: book.title || 'N/A',
      autores: book.authors || null, // Mantener como array para la BD
      descripcion: book.description || null,
      thumbnail: book.imageLinks?.thumbnail || null,
      image_path: imagePath, // Cambiado a snake_case para BD
    }
  } catch {
    return null
  }
}

async function processImage(imagePath: string): Promise<{
  imagePath: string
  isbn: string | null
  source: 'local' | 'openai' | null
  error?: string
}> {
  try {
    if (!existsSync(imagePath)) {
      return { imagePath, isbn: null, source: null, error: 'archivo no encontrado' }
    }

    // 1. Intentar lectura local
    console.log(`   🔍 Intentando lectura local: ${imagePath.split('/').pop()}`)
    let isbn = await extractISBNLocal(imagePath)
    let source: 'local' | 'openai' | null = 'local'

    if (isbn) {
      console.log(`      ✨ ISBN detectado localmente: ${isbn}`)
    } else {
      // 2. Si falla local, usar OpenAI
      console.log(`      🤖 Local falló. Usando OpenAI para: ${imagePath.split('/').pop()}`)
      const imageBuffer = await readFile(imagePath)
      const imageFile = new File([imageBuffer], imagePath.split('/').pop() || 'image.jpg', {
        type: 'image/jpeg',
      })

      const openaiResult = await extractISBNFromImage(imageFile)
      isbn = openaiResult === 'NOT_FOUND' ? null : openaiResult
      source = 'openai'

      if (isbn) {
        console.log(`      ✨ ISBN detectado por OpenAI: ${isbn}`)
      } else {
        console.log(`      ❌ No se encontró ISBN`)
      }
    }

    return {
      imagePath,
      isbn,
      source: isbn ? source : null,
    }
  } catch (error) {
    return {
      imagePath,
      isbn: null,
      source: null,
      error: error instanceof Error ? error.message : 'error desconocido',
    }
  }
}

async function getAllImages(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const res = join(dir, entry.name)
      if (entry.isDirectory()) {
        return getAllImages(res)
      } else {
        return /\.(png|jpg|jpeg)$/i.test(entry.name) ? [res] : []
      }
    })
  )
  return files.flat()
}

// Función auxiliar para chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size))
  }
  return chunked
}

async function registerBooksBatch() {
  const supabase = createSupabaseAdminClient()
  let result: ProcessingResult = {
    registered: [],
    fetched: [],
    duplicates: [],
    notFound: [],
    googleErrors: [],
    errors: [],
  }

  // Cargar estado anterior si existe para resumir
  if (existsSync(SUCCESS_LOG_FILE)) {
    try {
      const previousData = await readFile(SUCCESS_LOG_FILE, 'utf-8')
      result = JSON.parse(previousData)
      // Asegurar que fetched existe (para compatibilidad)
      if (!result.fetched) result.fetched = []
      console.log(
        `🔄 Reanudando sesión anterior. Registrados: ${result.registered.length}, Fetched: ${result.fetched.length}`
      )
    } catch (e) {
      console.log('⚠️ No se pudo leer el archivo de estado anterior, iniciando desde cero.')
    }
  }

  // Inicializar archivo de log de errores
  await writeFile(
    ERROR_LOG_FILE,
    `REPORTE DE ERRORES - ${new Date().toLocaleString()}\n============================================\n\n`
  )

  // Obtener todas las imágenes recursivamente
  console.log(`📂 Escaneando carpeta ${ZONES_DIR}...`)
  const cwd = process.cwd()
  const booksDir = join(cwd, ZONES_DIR)

  if (!existsSync(booksDir)) {
    console.error(`❌ La carpeta ${ZONES_DIR} no existe`)
    process.exit(1)
  }

  let allImages = await getAllImages(booksDir)
  console.log(`📚 Se encontraron ${allImages.length} imágenes en total.`)

  // 🧪 Modo prueba: limitar imágenes
  if (TEST_MODE) {
    allImages = allImages.slice(0, TEST_LIMIT)
    console.log(`🧪 MODO PRUEBA: Procesando solo ${allImages.length} imágenes\n`)
  }

  // Filtrar imágenes ya procesadas
  const processedPaths = new Set(
    [
      ...result.registered.map((r) => r.image_path),
      ...result.fetched.map((r) => r.image_path),
      ...result.duplicates.map((d) => d.imagePath),
      ...result.notFound.map((n) => n.imagePath),
      ...result.googleErrors.map((g) => g.imagePath),
      // No filtramos 'errors' para reintentarlos
    ].filter(Boolean)
  )

  allImages = allImages.filter((img) => !processedPaths.has(img))
  console.log(`✨ Imágenes pendientes de procesar: ${allImages.length}\n`)

  if (allImages.length === 0 && result.fetched.length === 0) {
    console.log('✅ Nada pendiente por procesar.')
    printSummary(result)
    return
  }

  // Procesar en lotes
  const chunks = chunkArray(allImages, CONCURRENCY_LIMIT)
  let processedCount = 0
  const validIsbnsWithData: Array<{ isbn: string; imagePath: string }> = []

  // Agregar también los que ya estaban en 'fetched' de una ejecución anterior fallida (para reintentar DB)
  // Pero primero procesamos las nuevas imágenes

  for (const chunk of chunks) {
    const promises = chunk.map(processImage)
    const chunkResults = await Promise.all(promises)

    for (const r of chunkResults) {
      if (r.isbn) {
        validIsbnsWithData.push({ isbn: r.isbn, imagePath: r.imagePath })
      } else {
        if (r.error) {
          result.errors.push({ imagePath: r.imagePath, error: r.error })
          await appendFile(ERROR_LOG_FILE, `ERROR PROCESAMIENTO: ${r.imagePath} - ${r.error}\n`)
        } else {
          result.notFound.push({ imagePath: r.imagePath })
          await appendFile(ERROR_LOG_FILE, `NO ISBN ENCONTRADO: ${r.imagePath}\n`)
        }
      }
    }

    processedCount += chunk.length
    console.log(`   ⏳ Progreso: ${processedCount}/${allImages.length} imágenes procesadas`)

    // Guardar progreso parcial
    await writeFile(SUCCESS_LOG_FILE, JSON.stringify(result, null, 2))
  }

  // Recuperar ISBNs de 'fetched' anterior si vamos a reintentar inserción
  // (Nota: si ya están en fetched, no necesitamos extraer ISBN ni buscar en Google, ir directo a paso 4)
  const booksReadyToInsert = [...result.fetched]

  // Agregar los nuevos encontrados
  if (validIsbnsWithData.length > 0) {
    // Paso 2: Verificar duplicados en DB
    console.log('\n2️⃣ Verificando duplicados en la base de datos...')
    // Procesar verificación de duplicados en lotes grandes (para no exceder límites de query string)
    const uniqueIsbns = Array.from(new Set(validIsbnsWithData.map((v) => v.isbn)))

    let existingMap = new Map<string, string>()
    try {
      const { data: existingBooks } = await supabase.from('libros').select('isbn, titulo').in('isbn', uniqueIsbns)
      existingMap = new Map(existingBooks?.map((b) => [b.isbn, b.titulo]) || [])
    } catch (e) {
      console.error(
        '⚠️ Error al conectar con BD para verificar duplicados. Asumiendo no duplicados para continuar proceso (se verificará al insertar).'
      )
    }

    const newIsbnsToFetch = uniqueIsbns.filter((isbn) => !existingMap.has(isbn))

    // Registrar duplicados
    validIsbnsWithData.forEach(({ isbn, imagePath }) => {
      if (existingMap.has(isbn)) {
        result.duplicates.push({ isbn, titulo: existingMap.get(isbn), imagePath })
      }
    })

    console.log(`   ✓ ${existingMap.size} libros ya registrados`)
    console.log(`   → ${newIsbnsToFetch.length} libros nuevos para buscar información`)

    // Filtrar validIsbnsWithData para mantener solo los que NO son duplicados
    const nonDuplicateItems = validIsbnsWithData.filter((v) => !existingMap.has(v.isbn))

    if (nonDuplicateItems.length > 0) {
      // Paso 3: Google Books (con concurrencia)
      console.log('\n3️⃣ Buscando información en Google Books...')

      // Agrupar por ISBN para no buscar el mismo ISBN multiples veces si aparece en varias imagenes
      const uniqueItemsToFetch = new Map<string, string>() // isbn -> imagePath
      nonDuplicateItems.forEach((i) => uniqueItemsToFetch.set(i.isbn, i.imagePath))

      const isbnChunks = chunkArray(Array.from(uniqueItemsToFetch.entries()), 5)

      for (const chunk of isbnChunks) {
        const promises = chunk.map(async ([isbn, imagePath]) => {
          const book = await fetchBookFromGoogle(isbn, imagePath)
          return { isbn, book, imagePath }
        })

        const chunkResults = await Promise.all(promises)

        chunkResults.forEach(({ isbn, book, imagePath }) => {
          if (book) {
            result.fetched.push(book)
            booksReadyToInsert.push(book)
          } else {
            result.googleErrors.push({ isbn, imagePath })
            appendFile(ERROR_LOG_FILE, `ERROR GOOGLE BOOKS: ISBN ${isbn} no encontrado (Imagen: ${imagePath})\n`).catch(
              console.error
            )
          }
        })
      }
      // Guardar progreso tras Google Books
      await writeFile(SUCCESS_LOG_FILE, JSON.stringify(result, null, 2))
    }
  }

  // Paso 4: Insertar
  if (booksReadyToInsert.length > 0) {
    console.log(`\n4️⃣ Intentando registrar ${booksReadyToInsert.length} libros en la base de datos...`)

    // Filtramos los que ya están en 'registered' por si acaso (aunque no deberian)
    const registeredIsbns = new Set(result.registered.map((r) => r.isbn))
    const toInsert = booksReadyToInsert.filter((b) => !registeredIsbns.has(b.isbn))

    if (toInsert.length === 0) {
      console.log('   ✓ Todos los libros recuperados ya estaban marcados como registrados.')
    } else {
      const { error: insertError } = await supabase.from('libros').insert(toInsert)

      if (insertError) {
        console.error('   ✗ Error al insertar en BD:', insertError.message)
        console.log(
          '   💾 Los datos están seguros en "fetched" dentro de processed-books.json y se pueden reintentar luego.'
        )
        await appendFile(ERROR_LOG_FILE, `ERROR BASE DE DATOS: ${insertError.message}\n`)
      } else {
        // Mover de fetched a registered
        result.registered.push(...toInsert)
        result.fetched = [] // Limpiar fetched ya que se registraron
        console.log(`   ✓ Registro exitoso de ${toInsert.length} libros`)
      }
    }
  }

  // Guardar resultados finales
  await writeFile(SUCCESS_LOG_FILE, JSON.stringify(result, null, 2))

  printSummary(result)
}

function printSummary(result: ProcessingResult) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN FINAL')
  console.log('='.repeat(60))
  console.log(`✅ Registrados en BD:    ${result.registered.length}`)
  console.log(`📥 Recuperados (pending):${result.fetched.length}`)
  console.log(`⚠️  Ya existentes:       ${result.duplicates.length}`)
  console.log(`⊘ Sin ISBN:            ${result.notFound.length}`)
  console.log(`✗ Error Google:        ${result.googleErrors.length}`)
  console.log(`✗ Otros Errores:       ${result.errors.length}`)
  console.log(`\n📄 Los detalles de errores se guardaron en: ${ERROR_LOG_FILE}`)
  console.log(`💾 Los datos procesados se guardaron en: ${SUCCESS_LOG_FILE}`)
  console.log('='.repeat(60))
}

registerBooksBatch().catch(console.error)
