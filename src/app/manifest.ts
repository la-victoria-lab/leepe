import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LEE(PE) - Sistema de Gestión de Libros',
    short_name: 'LEE(PE)',
    description: 'Registra, presta y gestiona libros',
    start_url: '/',
    display: 'standalone',
    background_color: '#4C1D95',
    theme_color: '#7C3AED',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
