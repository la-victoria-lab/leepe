# 🐛 Debugging de Cámara - LEE(PE)

## 🔴 Problemas Reportados

### Desktop: Pantalla negra
- La cámara se activa pero no se ve nada, solo negro

### Mobile: Error 405
- Aparece error HTTP 405 al intentar acceder a la cámara

---

## 🔍 Logging Agregado

Ahora el scanner tiene logging detallado. Para ver los logs:

```bash
bun run dev
```

Y abre la consola del navegador (F12). Verás logs como:

```
[INFO] Starting camera access...
[INFO] Requesting camera permission...
[INFO] Camera access granted { tracks: 1, settings: {...} }
[INFO] Starting video playback...
[INFO] Video is playing { videoWidth: 1280, videoHeight: 720, readyState: 4 }
[INFO] Initializing ZXing reader...
[INFO] ZXing reader initialized
```

---

## 🔧 Diagnóstico Paso a Paso

### 1. Verificar HTTPS / Localhost

**⚠️ IMPORTANTE**: Los navegadores modernos requieren HTTPS o localhost para acceso a cámara.

**Verifica tu URL:**
```
✅ http://localhost:3000      (OK)
✅ https://tu-dominio.com     (OK)
❌ http://192.168.1.100:3000  (NO funciona en mobile)
❌ http://tu-ip:3000          (NO funciona en mobile)
```

**Solución para testing en mobile:**
```bash
# Opción 1: Usar ngrok
npx ngrok http 3000
# Te da una URL HTTPS: https://abc123.ngrok.io

# Opción 2: Usar localtunnel
npx localtunnel --port 3000
```

### 2. Verificar Permisos de Cámara

**Desktop (Chrome/Edge):**
1. Click en el icono del candado (🔒) en la barra de direcciones
2. Verifica que "Cámara" esté en "Permitir"
3. Si está en "Bloquear", cámbialo a "Permitir" y recarga

**Desktop (Safari):**
1. Safari → Preferencias → Sitios web → Cámara
2. Encuentra tu sitio y selecciona "Permitir"

**Mobile (iOS Safari):**
1. Configuración → Safari → Cámara
2. Selecciona "Preguntar" o "Permitir"

**Mobile (Android Chrome):**
1. Chrome → Configuración → Configuración de sitios → Cámara
2. Busca tu sitio y permite acceso

### 3. Verificar Logs en la Consola

Abre la consola del navegador:

**Desktop:**
- Chrome/Edge: F12 o Ctrl+Shift+I
- Safari: Cmd+Option+I (habilitar menú Desarrollador primero)

**Mobile:**
- iOS Safari: Conecta a Mac → Safari → Develop → Tu iPhone
- Android Chrome: chrome://inspect en desktop

**Busca estos mensajes:**

#### ✅ Éxito:
```
[INFO] Camera access granted
[INFO] Video is playing { videoWidth: 1280, ... }
```

#### ❌ Errores comunes:

**"NotAllowedError":**
```
[ERROR] Camera access error { name: "NotAllowedError" }
```
**Solución**: Dar permisos de cámara (ver paso 2)

**"NotFoundError":**
```
[ERROR] Camera access error { name: "NotFoundError" }
```
**Solución**: El dispositivo no tiene cámara o no está conectada

**"NotReadableError":**
```
[ERROR] Camera access error { name: "NotReadableError" }
```
**Solución**: Otra app está usando la cámara. Cierra Zoom, Teams, etc.

**Error 405:**
```
[ERROR] Camera access error { message: "...405..." }
```
**Solución**: Estás accediendo por HTTP desde mobile. Usa HTTPS (ver paso 1)

### 4. Probar con Versión Simple

Si sigue sin funcionar, prueba esta versión mínima:

```bash
# Crea un archivo test-camera.html
cat > /Users/jerson/Proyectos/LVL/leepe/public/test-camera.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Test Cámara</title>
    <style>
        video { width: 100%; max-width: 640px; background: black; }
        body { font-family: sans-serif; padding: 20px; }
    </style>
</head>
<body>
    <h1>Test de Cámara</h1>
    <button id="start">Iniciar Cámara</button>
    <div id="status"></div>
    <video id="video" autoplay playsinline muted></video>

    <script>
        const video = document.getElementById('video');
        const status = document.getElementById('status');
        const startBtn = document.getElementById('start');

        startBtn.onclick = async () => {
            try {
                status.textContent = 'Solicitando acceso...';
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });

                status.textContent = '✅ Cámara activada';
                video.srcObject = stream;

                console.log('Stream tracks:', stream.getVideoTracks());
                console.log('Video dimensions:', video.videoWidth, video.videoHeight);
            } catch (err) {
                status.textContent = '❌ Error: ' + err.message;
                console.error('Error completo:', err);
            }
        };
    </script>
</body>
</html>
EOF
```

Luego ve a: `http://localhost:3000/test-camera.html`

**Si esto funciona pero el scanner no:**
- Problema es con ZXing, no con la cámara
- Verifica que @zxing/library esté instalado correctamente

**Si esto NO funciona:**
- Problema es con permisos/HTTPS
- Sigue los pasos 1 y 2

---

## 🔬 Problemas Específicos

### Pantalla Negra en Desktop

**Causas posibles:**

1. **Video no tiene dimensiones:**
   - Verifica en console: `videoWidth` y `videoHeight` > 0
   - Si son 0, el stream no está activo

2. **CSS oculta el video:**
   - Verifica en DevTools si el video tiene `display: none` o similar
   - El video debe estar visible con z-index apropiado

3. **Stream no asignado correctamente:**
   - Verifica en logs: "Video is playing"
   - Si no aparece, hay problema con `video.play()`

**Solución temporal:**
Comenta temporalmente ZXing para ver si el video se muestra:

```typescript
// En IsbnScanner.tsx, comenta esto temporalmente:
// reader.decodeFromVideoDevice(...)
```

### Error 405 en Mobile

**Causa principal:** Acceso por HTTP sin HTTPS

**Verificación:**
```
URL actual: _____________

Si empieza con http:// (no https://) y NO es localhost
→ Este es el problema
```

**Soluciones:**

**Opción A: ngrok (más fácil)**
```bash
bun run dev
# En otra terminal:
npx ngrok http 3000

# Copia la URL https://xyz.ngrok.io
# Úsala en tu móvil
```

**Opción B: Certificado SSL local**
```bash
# Instalar mkcert
brew install mkcert
mkcert -install

# Crear certificado
mkcert localhost

# Usar en Next.js (necesita configuración)
```

**Opción C: Deploy temporal en Vercel**
```bash
npx vercel --prod
# Te da URL HTTPS automáticamente
```

---

## ✅ Checklist de Solución

- [ ] Accediendo por HTTPS o localhost
- [ ] Permisos de cámara concedidos
- [ ] Ninguna otra app usando la cámara
- [ ] Logs muestran "Camera access granted"
- [ ] Logs muestran "Video is playing"
- [ ] videoWidth y videoHeight > 0
- [ ] @zxing/library instalado: `bun list | grep zxing`

---

## 🆘 Si Nada Funciona

1. **Captura logs completos:**
   ```bash
   # En consola del navegador:
   # Copia TODO el output cuando intentas activar la cámara
   ```

2. **Info del sistema:**
   - Navegador y versión: _____________
   - Sistema operativo: _____________
   - URL que estás usando: _____________
   - ¿Es HTTP o HTTPS?: _____________

3. **Prueba básica:**
   - ¿Funciona el test-camera.html?: Sí / No
   - ¿Aparece mensaje de permisos?: Sí / No
   - ¿Qué error exacto aparece?: _____________

---

## 🔄 Testing Rápido

```bash
# 1. Iniciar servidor
bun run dev

# 2. Abrir en navegador
# Desktop: http://localhost:3000
# Mobile: https://[tu-ngrok-url]

# 3. Ir a Préstamos

# 4. Abrir consola (F12)

# 5. Ver logs cuando se abre la cámara

# 6. Compartir logs si hay error
```

---

**Última actualización**: 2024-02-11
