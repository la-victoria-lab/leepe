'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        // Force check for updates on every page load
        await registration.update()
      } catch (error) {
        console.error('[pwa] failed to register service worker', error)
      }
    }

    register()
  }, [])

  return null
}
