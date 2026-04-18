'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { formatDate, daysUntil } from '@/lib/utils'

export default function MeusProjetosPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.error) { router.push('/'); return }
      setSession(d)
    })
    loadProjects()
  }, [])

  async function loadProjects() {
    const res = await fetch('/api/projects')
    if (res.status === 401) { router.push('/'); return }
    setProjects(await res.json())
    setLoading(false)
  }

  async function confirm(id: string) {
    setConfirming(id)
    await fetch(`/api/projects/${id}/confirm`, { method: 'POST' })
    setConfirming(null)
    loadProjects()
  }

  const pendentes = projects.filter(p => p.status === 'DELEGADO')
  const ativos = projects.filter(p => ['CONFIRMADO','EM_PRODUCAO','EM_REVISAO'].includes(p.status))
  const atrasados = projects.filter(p => p.status === 'ATRASADO')
  const concluidos = projects.filter(p => ['CONCLUIDO','APROVADO'].includes(p.status))

  const stats = [
    { label: 'Para Confirmar', value: pendentes.length, color: '#d97706', bg: '#fffbeb' },
    { label: 'Em Execução', value: ativos.length, color: '#1d4ed8', bg: '#eff6ff' },
    { label: 'Atrasados', value: atrasados.length, color: '#dc2626', bg: '#fef2f2' },
    { label: 'Concluídos', value: concluidos.length, color: '#16a34a', bg: '#f0fdf4' },
  ]

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Olá, {session?.name?.split(' ')[0]}
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>
          {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-icon" style={{ background: s.bg, width: 44, height: 44 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: s.color, opacity: 0.7 }} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pendentes de confirmação */}
      {pendentes.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#d97706' }} />
            Aguardam a tua confirmação
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendentes.map(p => (
              <div key={p.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{p.client} · Prazo: {formatDate(p.deadline)}</div>
                  <div style={{ fontSize: 12, color: '#92400e', marginTop: 4 }}>Delegado por {p.delegatedByName || '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <PriorityBadge priority={p.priority} />
                  <button
                    onClick={() => confirm(p.id)}
                    disabled={confirming === p.id}
                    className="btn-primary"
                    style={{ background: '#d97706', whiteSpace: 'nowrap' }}
                  >
                    {confirming === p.id ? '…' : '✓ Confirmar Responsabilidade'}
                  </button>
                  <button onClick={() => router.push(`/projetos/${p.id}`)} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                    Ver detalhes
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Atrasados */}
      {atrasados.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
            Projetos Atrasados
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {atrasados.map(p => {
              const days = Math.abs(daysUntil(p.deadline))
              return (
                <div key={p.id} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => router.push(`/projetos/${p.id}`)}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{p.client}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>{days}d atrasado</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Em execução */}
      {ativos.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#1d4ed8' }} />
            Em Execução
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ativos.map(p => {
              const days = daysUntil(p.deadline)
              return (
                <div key={p.id} className="card" style={{ cursor: 'pointer', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => router.push(`/projetos/${p.id}`)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{p.client}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <PriorityBadge priority={p.priority} />
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{p.progress}%</span>
                      <span style={{ fontSize: 12, color: days < 0 ? '#dc2626' : days <= 3 ? '#d97706' : '#64748b', fontWeight: days <= 3 ? 700 : 400, whiteSpace: 'nowrap' }}>
                        {days < 0 ? `${Math.abs(days)}d atrasado` : `${days}d restantes`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Concluídos */}
      {concluidos.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
            Concluídos
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {concluidos.map(p => (
              <div key={p.id} style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', opacity: 0.75 }} onClick={() => router.push(`/projetos/${p.id}`)}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.client}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 56, height: 56, background: '#f1f5f9', borderRadius: 12, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 4, background: '#cbd5e1', borderRadius: 2, boxShadow: '0 8px 0 #cbd5e1, 0 16px 0 #cbd5e1' }} />
          </div>
          <p style={{ color: '#64748b', fontSize: 16, fontWeight: 500, margin: '0 0 6px' }}>Nenhum projeto atribuído ainda</p>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>O gestor irá delegar projetos em breve</p>
        </div>
      )}
    </div>
  )
}
