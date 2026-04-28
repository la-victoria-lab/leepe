# LEE(PE) — Sistema de Préstamos de Libros

Sistema de gestión de biblioteca interna para La Victoria Lab. Permite registrar libros por código de barras, gestionar préstamos y organizar el inventario por espacios físicos.

## Stack

- **Next.js 15** (App Router)
- **Supabase** (base de datos + autenticación con Google)
- **OpenAI** (extracción de ISBN desde imágenes)
- **Tailwind CSS** + shadcn/ui

## Desarrollo local

```bash
bun dev
```

Copia `.env.example` a `.env.local` y completa las variables.

## Roles

- **Admin** — registra libros, gestiona catálogo, espacios y ve el historial de préstamos
- **Usuario** — escanea y toma/devuelve libros prestados
