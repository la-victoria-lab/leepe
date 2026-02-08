'use client'

import { useState } from 'react'
import WelcomeScreen from './WelcomeScreen'
import LendBookTab from './LendBookTab'
import LogoutButton from './LogoutButton'

type UserPageClientProps = {
  userName: string
  embedded?: boolean
}

type ViewMode = 'welcome' | 'lend'

export default function UserPageClient({ userName, embedded = false }: UserPageClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('welcome')

  const canGoBack = viewMode !== 'welcome'
  const title = viewMode === 'lend' ? 'Prestar libro' : ''

  const containerClass = embedded ? 'h-full bg-gray-50 flex flex-col' : 'h-[100dvh] bg-gray-50'
  const innerContainerClass = embedded ? 'h-full flex flex-col' : 'h-full max-w-3xl mx-auto flex flex-col'

  return (
    <div className={containerClass}>
      <div className={innerContainerClass}>
        {!embedded && (
          <div className='shrink-0 bg-white/90 backdrop-blur border-b border-gray-200 pt-[env(safe-area-inset-top)]'>
            <div className='flex items-center justify-between gap-3 px-4 h-16'>
              <div className='w-24 flex items-center'>
              {canGoBack && (
                <button
                  type='button'
                  onClick={() => setViewMode('welcome')}
                  className='px-3 py-2 -ml-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition touch-manipulation flex items-center gap-1'
                >
                  <span className='text-lg'>←</span> Volver
                </button>
              )}
              </div>

              <div className='flex flex-col items-end justify-center min-w-0 text-right'>
                <p className='text-sm font-bold text-gray-900 truncate max-w-[150px]'>{userName}</p>
                <LogoutButton />
              </div>
            </div>
          </div>
        )}

        {embedded && canGoBack && (
          <div className='shrink-0 bg-white/90 backdrop-blur border-b border-gray-200'>
            <div className='flex items-center gap-3 px-4 h-12'>
              <button
                type='button'
                onClick={() => setViewMode('welcome')}
                className='px-3 py-2 -ml-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition touch-manipulation flex items-center gap-1'
              >
                <span className='text-lg'>←</span> Volver
              </button>
            </div>
          </div>
        )}

        <div className={`flex-1 min-h-0 px-4 pb-[env(safe-area-inset-bottom)] flex flex-col ${embedded ? 'overflow-y-auto' : 'justify-center'}`}>
          {title && (
            <div className='pt-4 pb-3 text-center shrink-0'>
              <h1 className='text-2xl font-semibold text-gray-900'>{title}</h1>
              <p className='text-sm text-gray-600 mt-1'>Escanea el código de barras para continuar</p>
            </div>
          )}

          <div className={`w-full max-w-md mx-auto ${embedded ? 'py-4' : 'min-h-0'}`}>
            {viewMode === 'lend' ? (
              <LendBookTab onSuccess={() => setViewMode('welcome')} />
            ) : (
              <WelcomeScreen
                userName={userName}
                onSelectLend={() => setViewMode('lend')}
                onReturnSuccess={() => setViewMode('welcome')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

