'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Users, AlertTriangle, BookMarked, TrendingUp, CheckCircle } from 'lucide-react'

type Metrics = {
  prestamosActivos: number
  prestamosVencidos: number
  copiasDisponibles: number
  totalLibros: number
  usuariosActivos: number
  masPrestaodos: { titulo: string; thumbnail: string | null; count: number }[]
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
  sub?: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-black text-slate-800">{value}</p>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardTab() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/metrics')
      .then((r) => r.json())
      .then((d) => setMetrics(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (!metrics) {
    return <p className="text-slate-400 text-center py-12">No se pudieron cargar las métricas.</p>
  }

  const disponibilidad =
    metrics.totalLibros > 0
      ? Math.round((metrics.copiasDisponibles / metrics.totalLibros) * 100)
      : 0

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Título */}
      <div className="hidden md:block">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard</h2>
        <p className="text-slate-500 font-medium">Resumen en tiempo real</p>
      </div>

      {/* Grid de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          icon={BookMarked}
          label="Préstamos activos"
          value={metrics.prestamosActivos}
          color="bg-blue-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Copias disponibles"
          value={metrics.copiasDisponibles}
          color="bg-emerald-500"
          sub={`${disponibilidad}% del catálogo`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Préstamos vencidos"
          value={metrics.prestamosVencidos}
          color={metrics.prestamosVencidos > 0 ? 'bg-red-500' : 'bg-slate-400'}
        />
        <StatCard
          icon={BookOpen}
          label="Total de libros"
          value={metrics.totalLibros}
          color="bg-violet-500"
        />
        <StatCard
          icon={Users}
          label="Usuarios con libros"
          value={metrics.usuariosActivos}
          color="bg-fuchsia-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Préstamos totales"
          value="—"
          color="bg-amber-500"
          sub="Ver historial"
        />
      </div>

      {/* Top libros más prestados */}
      {metrics.masPrestaodos.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-black text-slate-700 text-sm uppercase tracking-wider mb-4">
            📚 Más prestados
          </h3>
          <div className="space-y-3">
            {metrics.masPrestaodos.map((libro, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg font-black text-slate-300 w-6 text-center">{i + 1}</span>
                {libro.thumbnail ? (
                  <img
                    src={libro.thumbnail}
                    alt=""
                    className="w-8 h-12 object-cover rounded-md shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-8 h-12 bg-slate-100 rounded-md shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 line-clamp-1">{libro.titulo}</p>
                  <p className="text-xs text-slate-400">{libro.count} préstamo{libro.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
