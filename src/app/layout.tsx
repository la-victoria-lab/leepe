import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: 'LEE(PE)',
  description: 'Registra, presta y gestiona libros',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LEE(PE)',
  },
}

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
}

import { Outfit } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body
        className={`${outfit.className} antialiased bg-stone-50 text-stone-900 selection:bg-violet-100 selection:text-violet-900`}
      >
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
