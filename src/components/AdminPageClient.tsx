'use client'

import { useState } from 'react'
import RegisterBooksTab from './RegisterBooksTab'
import RegistrationHistory from './RegistrationHistory'
import LoansHistory from './LoansHistory'
import UserPageClient from './UserPageClient'
// Importar componente nuevo
import BookCatalog from './BookCatalog'

type AdminPageClientProps = {
  userName: string
}

type ViewMode = 'loans' | 'register' | 'history' | 'catalog' | 'user'

export default function AdminPageClient({ userName }: AdminPageClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('loans')

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col">
      <div className="shrink-0 bg-white/90 backdrop-blur border-b border-gray-200 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between gap-3 px-4 h-16">
          <h1 className="text-xl font-bold text-gray-900">admin</h1>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600 truncate max-w-[150px]">{userName}</p>
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setViewMode('loans')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              viewMode === 'loans' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Préstamos
          </button>
          <button
            type="button"
            onClick={() => setViewMode('catalog')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              viewMode === 'catalog' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Catálogo
          </button>
          <button
            type="button"
            onClick={() => setViewMode('register')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              viewMode === 'register' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Registrar Masivo
          </button>
          <button
            type="button"
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              viewMode === 'history' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Historial
          </button>
          <button
            type="button"
            onClick={() => setViewMode('user')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              viewMode === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Usuario
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'user' ? (
          <div className="h-full">
            <UserPageClient
              userName={userName}
              embedded
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto px-4 py-4 pb-[env(safe-area-inset-bottom)]">
            <div className="max-w-6xl mx-auto">
              {viewMode === 'loans' && <LoansHistory />}
              {viewMode === 'catalog' && (
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-2xl font-bold mb-4">Catálogo de Libros</h2>
                  <BookCatalog />
                </div>
              )}
              {viewMode === 'register' && (
                <div className="border rounded-xl p-4 bg-white shadow">
                  <h2 className="text-lg font-bold mb-3">Registrar libros (Carga Masiva)</h2>
                  <RegisterBooksTab />
                </div>
              )}
              {viewMode === 'history' && <RegistrationHistory />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
