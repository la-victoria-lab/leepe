/**
 * Categorizer: Infiere géneros y propiedades de libros basado en títulos, autores y descripciones
 * Usa keyword matching para clasificar automáticamente sin necesidad de datos en BD
 */

export interface BookCategories {
  generos: string[]
  idioma: string
  nivel: 'principiante' | 'intermedio' | 'avanzado'
}

/**
 * Detecta el idioma del libro basado en patrones de palabras
 */
export function detectarIdioma(
  titulo: string,
  autores: string | string[] | null,
  descripcion?: string | null
): string {
  const texto = `${titulo} ${Array.isArray(autores) ? autores.join(' ') : autores || ''} ${descripcion || ''}`.toLowerCase()

  // Palabras clave en inglés
  const enPatterns = [
    /\b(the|and|of|in|to|a|is|business|management|leadership|psychology|data|science|economics|artificial|intelligence|machine|learning)\b/g,
  ]

  // Palabras clave en español
  const esPatterns = [
    /\b(el|la|los|las|de|y|en|a|es|negocio|liderazgo|psicología|economía|tecnología|desarrollo|programación|marketing)\b/g,
  ]

  // Palabras clave en portugués
  const ptPatterns = [/\b(o|a|os|as|de|e|em|para|português|brasil|rio)\b/g]

  const enMatches = texto.match(enPatterns[0])?.length || 0
  const esMatches = texto.match(esPatterns[0])?.length || 0
  const ptMatches = texto.match(ptPatterns[0])?.length || 0

  // Retornar idioma con más coincidencias
  if (enMatches > esMatches && enMatches > ptMatches) return 'Inglés'
  if (ptMatches > esMatches) return 'Portugués'
  return 'Español'
}

/**
 * Categoriza un libro en múltiples géneros basado en análisis de texto
 */
export function categorizarLibro(
  titulo: string,
  autores: string | string[] | null,
  descripcion?: string | null
): string[] {
  const texto = `${titulo} ${Array.isArray(autores) ? autores.join(' ') : autores || ''} ${descripcion || ''}`.toLowerCase()

  const categorias: string[] = []

  // Negocios, Emprendimiento, Inversión
  if (/negocio|business|entrepreneur|startup|inversión|investment|finanza|finance|mercado|market|empresa|corporate|management|liderazgo|leadership|estrategia|strategy|ventas|sales|marketing/.test(
    texto
  )) {
    categorias.push('Negocios')
  }

  // Ficción, Novelas, Cuentos
  if (
    /ficción|fiction|novela|novel|cuento|story|narrativa|narrative|cuentista|thriller|mystery|romance|drama|historic|histórico|aventura|adventure/.test(
      texto
    )
  ) {
    categorias.push('Ficción')
  }

  // Ciencia, Matemática, Física
  if (
    /ciencia|science|física|physics|quantum|matemática|mathematics|química|chemistry|biología|biology|astrofísica|astrophysics|relatividad|relativity|evolución|evolution/.test(
      texto
    )
  ) {
    categorias.push('Ciencia')
  }

  // Tecnología, Programación, Software
  if (
    /tecnología|technology|programación|programming|software|código|code|algoritmo|algorithm|javascript|python|react|web|app|artificial|intelligence|machine|learning|data|database|cloud|kubernetes|docker/.test(
      texto
    )
  ) {
    categorias.push('Tecnología')
  }

  // Psicología, Autoayuda, Desarrollo Personal
  if (
    /psicología|psychology|mental|mindfulness|meditación|meditation|hábito|habit|motivación|motivation|autoayuda|self-help|desarrollo|personal|growth|bienestar|wellness|ansiedad|anxiety|depresión|depression|felicidad|happiness|estrés|stress/.test(
      texto
    )
  ) {
    categorias.push('Psicología')
  }

  // Arte, Diseño, Fotografía, Arquitectura
  if (
    /arte|art|diseño|design|fotografía|photography|pintura|painting|escultura|sculpture|arquitectura|architecture|ilustración|illustration|creatividad|creativity|estética|aesthetic/.test(
      texto
    )
  ) {
    categorias.push('Arte')
  }

  // Historia, Biografía, Política, Sociología
  if (
    /historia|history|biografía|biography|política|politics|sociología|sociology|cultura|culture|civilización|civilization|revolución|revolution|sociedad|society|gobierno|government|democracia|democracy/.test(
      texto
    )
  ) {
    categorias.push('Historia')
  }

  // Educación, Pedagogía, Aprendizaje
  if (
    /educación|education|aprendizaje|learning|enseñanza|teaching|pedagogía|pedagogy|estudiante|student|escuela|school|universidad|university|academía|academy/.test(
      texto
    )
  ) {
    categorias.push('Educación')
  }

  // Salud, Medicina, Nutrición
  if (
    /salud|health|medicina|medicine|médico|medical|nutrición|nutrition|dieta|diet|ejercicio|exercise|deporte|sport|fitness|cuerpo|body|enfermedad|disease|cura|cure|wellness/.test(
      texto
    )
  ) {
    categorias.push('Salud')
  }

  // Viajes, Geografía, Aventura
  if (
    /viajes|travel|geografía|geography|aventura|adventure|mundo|world|país|country|ciudad|city|turismo|tourism|naturaleza|nature|montaña|mountain|playa|beach/.test(
      texto
    )
  ) {
    categorias.push('Viajes')
  }

  // Religión, Espiritualidad, Filosofía
  if (
    /religión|religion|espiritualidad|spirituality|filosofía|philosophy|dios|god|fe|faith|budismo|buddhism|cristianismo|christianity|islam|existencia|existence|ética|ethics/.test(
      texto
    )
  ) {
    categorias.push('Filosofía')
  }

  // Por defecto, agregar "General" si no hay categorías
  if (categorias.length === 0) {
    categorias.push('General')
  }

  return [...new Set(categorias)] // Remover duplicados
}

/**
 * Detecta el nivel de lectura (principiante, intermedio, avanzado)
 */
export function detectarNivel(
  titulo: string,
  autores: string | string[] | null,
  descripcion?: string | null
): 'principiante' | 'intermedio' | 'avanzado' {
  const texto = `${titulo} ${Array.isArray(autores) ? autores.join(' ') : autores || ''} ${descripcion || ''}`.toLowerCase()

  // Nivel avanzado: palabras técnicas, académicas, complejas
  if (
    /advanced|avanzado|expert|experto|profesional|research|investigación|quantum|relatividad|tesis|dissertation|teórico|theoretical|complex|complejo|especializado|specialized/.test(
      texto
    )
  ) {
    return 'avanzado'
  }

  // Nivel principiante: palabras simples, introductorias
  if (
    /beginner|principiante|intro|introducción|básico|basic|simple|guía|guide|manual|how-to|para dummies|101|start|comenzar|fácil|easy/.test(
      texto
    )
  ) {
    return 'principiante'
  }

  // Por defecto: intermedio
  return 'intermedio'
}

/**
 * Función principal que categoriza completamente un libro
 */
export function categorizarLibroCompleto(
  titulo: string,
  autores: string | string[] | null,
  descripcion?: string | null
): BookCategories {
  return {
    generos: categorizarLibro(titulo, autores, descripcion),
    idioma: detectarIdioma(titulo, autores, descripcion),
    nivel: detectarNivel(titulo, autores, descripcion),
  }
}

/**
 * Helper: Obtener lista de todos los géneros posibles
 */
export const GENEROS_DISPONIBLES = [
  'Negocios',
  'Ficción',
  'Ciencia',
  'Tecnología',
  'Psicología',
  'Arte',
  'Historia',
  'Educación',
  'Salud',
  'Viajes',
  'Filosofía',
  'General',
]

export const IDIOMAS_DISPONIBLES = ['Español', 'Inglés', 'Portugués']

export const NIVELES_DISPONIBLES = ['principiante', 'intermedio', 'avanzado']
