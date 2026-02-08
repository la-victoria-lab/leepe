# 🚀 Configuración de Base de Datos desde Cero

Esta guía te llevará paso a paso para configurar tu nueva base de datos de Supabase para el proyecto Leepe.

---

## 📋 Checklist General

- [ ] **Paso 1**: Ejecutar SQL de inicialización
- [ ] **Paso 2**: Verificar que las tablas se crearon
- [ ] **Paso 3**: Configurar Google OAuth
- [ ] **Paso 4**: Actualizar redirect URI en Google Cloud Console
- [ ] **Paso 5**: Verificar conexión
- [ ] **Paso 6**: Probar la aplicación

---

## Paso 1: Ejecutar SQL de Inicialización 📝

### Opción A: Usando el Panel Web de Supabase (Recomendado)

1. **Abre el SQL Editor**:
   - Ve a: https://supabase.com/dashboard/project/ghnyliwownuinqvnvhvg/sql
   - O navega: Dashboard → SQL Editor

2. **Crea una nueva query**:
   - Haz clic en **"New Query"** o el botón **"+"**

3. **Copia y pega el SQL**:
   - Abre el archivo: `scripts/migration/init-database.sql`
   - Copia TODO el contenido
   - Pégalo en el editor de Supabase

4. **Ejecuta el script**:
   - Haz clic en **"Run"** (o presiona `Ctrl+Enter` / `Cmd+Enter`)
   - Espera a que termine (debería tomar ~5 segundos)

5. **Verifica que no hay errores**:
   - Deberías ver mensajes de "Success" en verde
   - Si hay algún error en rojo, cópialo y pregúntame

### Opción B: Usando la Terminal (Avanzado)

```bash
# Desde la raíz del proyecto
psql "postgresql://postgres.[YOUR-PASSWORD]@db.ghnyliwownuinqvnvhvg.supabase.co:5432/postgres" < scripts/migration/init-database.sql
```

---

## Paso 2: Verificar Tablas Creadas ✅

1. **Ve al Table Editor**:
   - https://supabase.com/dashboard/project/ghnyliwownuinqvnvhvg/editor

2. **Deberías ver estas tablas**:
   - ✅ `libros` - Inventario de libros
   - ✅ `prestamos` - Registro de préstamos
3. **Deberías ver esta vista**:
   - ✅ `libros_estado` - Vista con estado actual de cada libro

Si no ves las tablas, algo salió mal en el Paso 1. Dímelo y te ayudo.

---

## Paso 3: Configurar Google OAuth 🔐

1. **Abre Authentication Settings**:
   - Ve a: https://supabase.com/dashboard/project/ghnyliwownuinqvnvhvg/auth/providers
   - O navega: Dashboard → Authentication → Providers

2. **Busca "Google" en la lista de providers**:
   - Haz clic en **"Google"**

3. **Habilita Google OAuth**:
   - Activa el toggle **"Enable Sign in with Google"**

4. **Configura las credenciales**:
   Ingresa estos valores (los tienes en tu `.env.local`):

   ```
   Client ID (for OAuth): 64305238620-jnvdb20ln0e15jhi7cejufk94k1377gm.apps.googleusercontent.com
   Client Secret (for OAuth): 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
   ```

5. **Guarda los cambios**:
   - Haz clic en **"Save"** al final de la página

6. **Copia la Redirect URL que aparece**:
   - Debería ser algo como: `https://ghnyliwownuinqvnvhvg.supabase.co/auth/v1/callback`
   - La necesitarás para el siguiente paso

---

## Paso 4: Actualizar Google Cloud Console 🔄

Si tu Google OAuth Client fue creado para el proyecto anterior, necesitas agregar la nueva URL de callback:

### 4.1. Accede a Google Cloud Console

1. Ve a: https://console.cloud.google.com/apis/credentials
2. Inicia sesión con la cuenta que creó el OAuth Client
3. Selecciona el proyecto correcto (si tienes varios)

### 4.2. Encuentra tu OAuth 2.0 Client ID

1. Busca en la lista el Client ID que empieza con: `64305238620-...`
2. Haz clic sobre él para editarlo

### 4.3. Actualiza las URIs autorizadas

1. Busca la sección **"Authorized redirect URIs"**
2. Haz clic en **"+ ADD URI"**
3. Agrega esta nueva URL:
   ```
   https://ghnyliwownuinqvnvhvg.supabase.co/auth/v1/callback
   ```
4. **Opcional**: Puedes dejar la URL anterior por ahora (para rollback si es necesario)
5. Haz clic en **"Save"** al final de la página

**⚠️ Importante**: Los cambios en Google pueden tomar unos minutos en propagarse (usualmente es instantáneo, pero puede tardar hasta 5 minutos).

---

## Paso 5: Verificar Conexión 🔌

Desde tu terminal, ejecuta:

```bash
bun run scripts/migration/verify-migration.ts
```

**Resultado esperado**:

```
✅ Conexión exitosa
✅ Tabla "libros": 0 registros
✅ Tabla "prestamos": 0 registros
✅ RLS está habilitado correctamente
✅ ¡Migración verificada exitosamente!
```

Si ves errores, cópialos y pregúntame.

---

## Paso 6: Probar la Aplicación 🧪

### 6.1. Reiniciar el servidor de desarrollo

Si tu servidor aún está corriendo, necesitas reiniciarlo para que tome las nuevas variables de entorno:

```bash
# En la terminal donde está corriendo `bun dev`:
# Presiona Ctrl+C para detenerlo

# Luego vuelve a iniciarlo:
bun dev
```

### 6.2. Probar Login

1. Abre tu navegador en: http://localhost:3000
2. Intenta iniciar sesión con Google
3. Usa una cuenta con email `@lavictoria.pe`

**Resultado esperado**:

- Deberías poder autenticarte correctamente
- No deberías ver errores en la consola del navegador
- Si eres `fabio@lavictoria.pe`, deberías tener acceso a funciones de admin

### 6.3. Probar Registro de Libros (Solo Admin)

Si eres admin:

1. Ve a la sección de registro de libros
2. Sube una foto del código de barras de un libro
3. Verifica que:
   - OpenAI extrae el ISBN correctamente
   - Se consulta la info del libro en Google Books
   - Se registra en la base de datos
   - Aparece en el listado de libros

### 6.4. Probar Préstamo de Libro

1. Escanea un libro que esté registrado
2. Verifica que se crea el préstamo correctamente
3. Verifica que el libro aparezca como "no disponible"

---

## 🆘 Troubleshooting

### Error: "Could not find the table 'public.libros'"

- El script SQL no se ejecutó correctamente
- Vuelve al Paso 1 y verifica que no haya errores

### Error al hacer login: "invalid_request"

- Google OAuth no está configurado correctamente
- Revisa el Paso 3 y asegúrate de haber guardado los cambios

### Error: "redirect_uri_mismatch"

- La redirect URI no está agregada en Google Cloud Console
- Revisa el Paso 4

### Error: "unauthorized" o "forbidden"

- Tu email no es `@lavictoria.pe`
- Revisa que estés usando el email correcto

### La aplicación no toma los cambios del .env.local

- No reiniciaste el servidor de desarrollo
- Detén `bun dev` (Ctrl+C) y vuelve a iniciarlo

---

## 📊 Estructura de Datos Creada

### Tabla `libros` (Inventario)

| Campo       | Tipo      | Descripción           |
| ----------- | --------- | --------------------- |
| isbn        | TEXT (PK) | ISBN único del libro  |
| titulo      | TEXT      | Título del libro      |
| autores     | TEXT[]    | Array de autores      |
| descripcion | TEXT      | Descripción del libro |
| thumbnail   | TEXT      | URL de la portada     |
| created_at  | TIMESTAMP | Fecha de registro     |
| updated_at  | TIMESTAMP | Última actualización  |

### Tabla `prestamos` (Préstamos)

| Campo            | Tipo      | Descripción                  |
| ---------------- | --------- | ---------------------------- |
| id               | UUID (PK) | ID único del préstamo        |
| libro_isbn       | TEXT (FK) | ISBN del libro prestado      |
| persona          | TEXT      | Email/nombre del prestatario |
| fecha_prestamo   | TIMESTAMP | Cuándo se prestó             |
| fecha_devolucion | TIMESTAMP | Cuándo se devolvió           |
| devuelto         | BOOLEAN   | Si ya fue devuelto           |
| created_at       | TIMESTAMP | Fecha de creación            |
| updated_at       | TIMESTAMP | Última actualización         |

### Vista `libros_estado` (Estado Actual)

Combina datos de `libros` y `prestamos` para mostrar:

- Todos los campos del libro
- Si está disponible o prestado
- A quién está prestado (si aplica)
- Fecha del préstamo activo (si aplica)

---

## 🎉 ¡Listo!

Si completaste todos los pasos y las pruebas funcionan, ¡tu migración está completa!

### Siguiente paso: Actualizar OpenAI API Key

Si necesitas actualizar tu API key de OpenAI:

1. Ve a: https://platform.openai.com/api-keys
2. Crea una nueva API key
3. Actualiza la variable `OPENAI_API_KEY` en tu `.env.local`
4. Reinicia el servidor

---

¿Tienes algún problema? Dime en qué paso te quedaste y te ayudo.
