'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { formatDate, daysUntil } from '@/lib/utils'

interface DashboardData {
  ativos: number
  atrasados: number
  concluidosHoje: number
  naoConfirmados: number
  disponiveis: number
  total: number
  canCreate: boolean
  workload: { id: string; name: string; avatar: string; count: number; atrasados: number; points: number }[]
  recent: any[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => { if (r.status === 401 || r.status === 403) { router.push('/'); return null } return r.json() })
      .then(d => { if (d) { setData(d); setLoading(false) } })
  }, [router])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #dbeafe', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>A carregar dashboard…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!data) return null

  const kpis = [
    { label: 'Em Produção',      value: data.ativos,          color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  link: '/projetos?status=EM_PRODUCAO' },
    { label: 'Atrasados',        value: data.atrasados,       color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   link: '/projetos?status=ATRASADO' },
    { label: 'Concluídos Hoje',  value: data.concluidosHoje,  color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   link: '/projetos?status=CONCLUIDO' },
    { label: 'Sem Confirmação',  value: data.naoConfirmados,  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  link: '/projetos?status=DELEGADO' },
    { label: 'Disponíveis',      value: data.disponiveis,     color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', link: '/projetos?status=DISPONIVEL' },
    { label: 'Total de Projetos',value: data.total,           color: '#a855f7', bg: 'rgba(168,85,247,0.12)',  link: '/projetos' },
  ]

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: 0 }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 0' }}>
            {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {data.canCreate && <a href="/projetos/novo" className="btn-primary">+ Novo Projeto</a>}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {kpis.map(kpi => (
          <a key={kpi.label} href={kpi.link} style={{ textDecoration: 'none' }}>
            <div className="kpi-card" style={{ cursor: 'pointer' }}>
              <div className="kpi-icon" style={{ background: kpi.bg, width: 44, height: 44 }}>
                <div style={{ width: 16, height: 16, borderRadius: 3, background: kpi.color, opacity: 0.7 }} />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{kpi.label}</div>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 20 }}>
        {/* Recent projects */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'white' }}>Projetos Recentes</h2>
            <a href="/projetos" style={{ fontSize: 13, color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>Ver todos</a>
          </div>
          <table>
            <thead>
              <tr>
                <th>Projeto</th>
                <th>Responsável</th>
                <th>Prazo</th>
                <th>Prioridade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map(p => {
                const days = daysUntil(p.deadline)
                return (
                  <tr key={p.id} onClick={() => router.push(`/projetos/${p.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'white', fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{p.client}</div>
                    </td>
                    <td>
                      {p.assignedToName
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{p.assignedToAvatar}</div>
                            <span style={{ fontSize: 13 }}>{p.assignedToName}</span>
                          </div>
                        : <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>—</span>}
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: days < 0 ? '#dc2626' : days <= 3 ? '#d97706' : '#0f172a', fontWeight: days <= 3 ? 600 : 400 }}>
                        {formatDate(p.deadline)}
                      </div>
                      {days < 0 && <div style={{ fontSize: 11, color: '#dc2626' }}>{Math.abs(days)}d atrasado</div>}
                      {days >= 0 && days <= 3 && <div style={{ fontSize: 11, color: '#d97706' }}>Faltam {days}d</div>}
                    </td>
                    <td><PriorityBadge priority={p.priority} /></td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Workload */}
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: 'white' }}>Carga de Trabalho</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {data.workload.map(w => (
              <div key={w.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{w.avatar}</div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{w.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>{w.count}</span>
                    {w.atrasados > 0 && (
                      <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '2px 6px', borderRadius: 999, fontWeight: 700 }}>
                        {w.atrasados} atr.
                      </span>
                    )}
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(100, w.count * 20)}%`, background: w.atrasados > 0 ? '#ef4444' : '#1d4ed8' }} />
                </div>
              </div>
            ))}
          </div>

          {(data.atrasados > 0 || data.naoConfirmados > 0) && (
            <div style={{ marginTop: 20, borderTop: '1px solid var(--glass-border)', paddingTop: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: '0 0 8px' }}>Alertas</h3>
              {data.atrasados > 0 && (
                <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 6, fontSize: 13, color: '#fca5a5', fontWeight: 500 }}>
                  {data.atrasados} projeto{data.atrasados > 1 ? 's' : ''} atrasado{data.atrasados > 1 ? 's' : ''}
                </div>
              )}
              {data.naoConfirmados > 0 && (
                <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 13, color: '#fcd34d', fontWeight: 500 }}>
                  {data.naoConfirmados} aguarda confirmação
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
