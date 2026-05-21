'use client'

import { useEffect, useState } from 'react'
import { Shield, Trash2, Plus, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AdminEmail = {
  id: string
  email: string
  created_at: string
}

export default function RolesTab() {
  const [admins, setAdmins] = useState<AdminEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const fetch_ = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/roles')
      const data = await res.json()
      setAdmins(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch_() }, [])

  const handleAdd = async () => {
    if (!newEmail.trim() || adding) return
    setAdding(true)
    setError('')
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewEmail('')
      await fetch_()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (email: string) => {
    if (!confirm(`¿Quitar rol admin a ${email}?`)) return
    try {
      const res = await fetch(`/api/admin/roles?email=${encodeURIComponent(email)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetch_()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="hidden md:block">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Roles y Permisos</h2>
        <p className="text-slate-500 font-medium">Gestiona quiénes tienen acceso de administrador</p>
      </div>

      {/* Agregar admin */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
        <h3 className="font-black text-slate-700 text-sm uppercase tracking-wider">Agregar administrador</h3>
        <div className="flex gap-2">
          <Input
            placeholder="email@lavictoria.pe"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="rounded-xl flex-1"
          />
          <Button
            onClick={handleAdd}
            disabled={adding || !newEmail.trim()}
            className="rounded-xl bg-slate-900 text-white gap-2"
          >
            <Plus size={16} />
            {adding ? '...' : 'Agregar'}
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {/* Lista de admins */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-black text-slate-700 text-sm uppercase tracking-wider mb-4">
          Administradores activos
        </h3>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : admins.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">
            No hay admins en la base de datos — se usan los del .env
          </p>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <Shield size={14} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{admin.email}</p>
                    <p className="text-[10px] text-slate-400">
                      Desde {new Date(admin.created_at).toLocaleDateString('es-PE')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(admin.email)}
                  className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center">
        💡 Los admins del .env.local siguen funcionando como respaldo
      </p>
    </div>
  )
}
