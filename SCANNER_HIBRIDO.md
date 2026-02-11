# 📱 Sistema de Scanner Híbrido - LEE(PE)

## 🎯 Objetivo

Implementar un sistema de escaneo de códigos de barras ISBN que:
1. **Minimice costos** usando tecnología gratuita
2. **Funcione en todos los navegadores** (Safari, Chrome, Firefox)
3. **Mantenga alta calidad** con fallback inteligente

---

## 🔄 Flujo del Sistema Híbrido (Completamente Automático)

```
┌─────────────────────────────────────────────────┐
│  Usuario escanea libro                          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  ZXing intenta detectar código de barras       │
│  🆓 GRATIS - Corre en el navegador              │
│  ⚡ Detección en tiempo real                    │
└────────────────┬────────────────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
    ✅ Detectó       ❌ No detectó
         │                │
         │                ▼
         │        ⏱️ Espera 5 segundos
         │                │
         │                ▼
         │        🤖 AUTO-CAPTURA (transparente)
         │                │
         ▼                ▼
┌─────────────────┐  ┌──────────────────────────┐
│ Envía ISBN      │  │ Envía foto a OpenAI GPT-4│
│ al backend      │  │ 📸 SIN click del usuario │
│ 💰 $0           │  │ 💰 ~$0.01-0.03 por foto  │
└─────────────────┘  └──────────────────────────┘
         │                │
         └────────┬───────┘
                  ▼
         ✅ Préstamo registrado
```

**🎯 Ventaja clave:** El usuario NUNCA tiene que presionar un botón adicional. Todo es automático y transparente.

---

## 💰 Análisis de Costos

### Escenario 1: ZXing funciona (95% de los casos)
- **Costo por escaneo**: $0.00
- **Velocidad**: Instantáneo
- **Precisión**: Alta (específico para códigos de barras)

### Escenario 2: Fallback a OpenAI (5% de los casos)
- **Costo por escaneo**: ~$0.01-0.03
- **Velocidad**: 2-4 segundos
- **Precisión**: Muy alta (GPT-4 Vision)

### Costo Promedio Real
Con 100 escaneos:
- 95 escaneos con ZXing: $0.00
- 5 escaneos con OpenAI: $0.05-0.15
- **Total: ~$0.05-0.15** vs **$1.00-3.00** (solo OpenAI)
- **Ahorro: ~95-98%** 💰

---

## 🛠️ Implementación Técnica

### Tecnologías Usadas

#### 1. **ZXing (@zxing/library)**
```typescript
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/library'

const reader = new BrowserMultiFormatReader()
reader.decodeFromVideoDevice(null, videoElement, (result, error) => {
  if (result) {
    const isbn = result.getText()
    // ISBN detectado - GRATIS ✅
  }
})
```

**Formatos soportados**:
- EAN-13 (ISBN-13)
- EAN-8 (ISBN-8)
- Code-128
- UPC-A/E

#### 2. **OpenAI GPT-4 Vision (Fallback)**
```typescript
// Solo se usa si ZXing no detecta nada en 15 segundos
const isbn = await extractISBNFromImage(capturedPhoto)
```

**Optimizaciones**:
- Imagen comprimida con Sharp (800x800px, JPEG 80%)
- Timeout de 30 segundos
- 2 reintentos automáticos

---

## 📊 Comparación con Sistema Anterior

| Aspecto | Antes (BarcodeDetector) | Ahora (ZXing Híbrido) |
|---------|-------------------------|----------------------|
| **Compatibilidad** | Solo Chrome Android | ✅ Todos los navegadores |
| **Costo promedio** | Alto (fallback inmediato) | ✅ ~95% gratis |
| **Velocidad** | Rápido (cuando funciona) | ✅ Instantáneo |
| **Fallback** | OpenAI siempre | ✅ Solo cuando es necesario |
| **UX** | Confusa (no detectaba nada) | ✅ Clara con indicadores |

---

## 🎨 Indicadores UX

### Estado 1: Escaneando (0-15s)
```
┌─────────────────────────────────┐
│  🔵 Buscando código de barras... │
└─────────────────────────────────┘
```

### Estado 2: Fallback automático (>5s)
```
┌─────────────────────────────────┐
│  🟣 🤖 Analizando con IA...      │
└─────────────────────────────────┘

(Sin botones - completamente automático)
```

### Estado 3: Éxito
```
┌─────────────────────────────────┐
│  ✅ ISBN detectado con ZXing     │
│     9781234567890                │
└─────────────────────────────────┘
```

---

## 🔍 Logging y Monitoreo

### Logs Estructurados

#### Éxito con ZXing (gratis)
```json
{
  "level": "info",
  "module": "isbn",
  "isbn": "9781234567890",
  "method": "zxing",
  "message": "ISBN detected successfully with ZXing"
}
```

#### Fallback a OpenAI
```json
{
  "level": "warn",
  "module": "isbn",
  "message": "ZXing could not detect barcode after 15s, enabling manual capture"
}
```

#### Uso de OpenAI (costo)
```json
{
  "level": "info",
  "module": "isbn",
  "isbn": "9781234567890",
  "method": "openai",
  "message": "ISBN extracted successfully"
}
```

---

## 🚀 Configuración

### Timeout de fallback automático
Modifica en `IsbnScanner.tsx`:
```typescript
// Por defecto: 5 segundos (balance entre UX y costo)
const AUTO_FALLBACK_TIMEOUT = 5000

// Para testing más rápido:
const AUTO_FALLBACK_TIMEOUT = 3000 // 3 segundos

// Si quieres dar más tiempo a ZXing:
const AUTO_FALLBACK_TIMEOUT = 8000 // 8 segundos
```

### Formatos de código de barras
```typescript
const hints = new Map()
hints.set(2, [
  BarcodeFormat.EAN_13,    // ISBN-13 principal
  BarcodeFormat.EAN_8,     // ISBN-8
  BarcodeFormat.CODE_128,  // Alternativo
  BarcodeFormat.UPC_A,     // Universal Product Code
  BarcodeFormat.UPC_E,
])
```

---

## 🐛 Troubleshooting

### ZXing no detecta códigos

**Problema**: La cámara funciona pero no detecta códigos de barras.

**Soluciones**:
1. Asegurar buena iluminación
2. Mantener el código a ~15-20cm de la cámara
3. Verificar que el código esté dentro del marco rectangular
4. Probar con diferentes ángulos

### Captura manual siempre se activa

**Problema**: El botón de captura manual aparece inmediatamente.

**Causa**: ZXing no puede inicializar correctamente.

**Solución**:
1. Verificar permisos de cámara
2. Revisar logs del navegador
3. Asegurar que @zxing/library esté instalado: `bun install @zxing/library`

### OpenAI no detecta ISBN en la foto

**Problema**: La captura manual no extrae el ISBN.

**Soluciones**:
1. Asegurar que el código sea visible y enfocado
2. Buena iluminación
3. Verificar que OPENAI_API_KEY esté configurada
4. Revisar logs del servidor

---

## 📈 Métricas de Éxito

Para evaluar el sistema, monitorea:

### KPIs
- **Tasa de éxito ZXing**: >90% ideal
- **Tiempo promedio de detección**: <3 segundos
- **Uso de fallback OpenAI**: <10% de escaneos
- **Costo promedio por escaneo**: <$0.002

### Queries de logs útiles

**Contar detecciones por método:**
```bash
# ZXing
grep "method.*zxing" logs.json | wc -l

# OpenAI
grep "method.*openai" logs.json | wc -l
```

**Calcular tasa de fallback:**
```bash
# (OpenAI / Total) * 100
```

---

## 🔐 Seguridad

### Validación de ISBN
Todos los ISBNs se validan con Zod:
```typescript
const IsbnSchema = z.string()
  .regex(/^(?:\d{10}|\d{13})$/, 'ISBN debe tener 10 o 13 dígitos')
```

### Límites de tamaño de imagen
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
```

---

## 🎓 Referencias

- [ZXing Documentation](https://github.com/zxing-js/library)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)

---

## ✅ Checklist de Testing

Antes de deployar, verificar:

- [ ] ZXing detecta códigos EAN-13 correctamente
- [ ] ZXing detecta códigos EAN-8 correctamente
- [ ] Fallback manual aparece después de 15s
- [ ] Captura manual funciona en Safari iOS
- [ ] Captura manual funciona en Chrome Android
- [ ] OpenAI extrae ISBNs de fotos borrosas
- [ ] Validación de ISBN rechaza formatos inválidos
- [ ] Logs estructurados se generan correctamente
- [ ] Costo promedio <$0.005 por escaneo

---

**Última actualización**: 2024-02-11
**Versión**: 1.0.0
**Mantenedor**: Equipo LEE(PE)
