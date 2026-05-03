'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { formatDate, daysUntil } from '@/lib/utils'

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (!d.error) setSession(d) })
    loadClient()
  }, [id])

  async function loadClient() {
    const res = await fetch(`/api/clients/${id}`)
    if (!res.ok) { router.push('/clientes'); return }
    setClient(await res.json())
    setLoading(false)
  }

  if (loading) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div className="spinner" style={{ margin: '40px auto 12px' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>A carregar…</p>
    </div>
  )
  if (!client) return null

  const projects = client.projects || []

  const stats = [
    { label: 'Total', value: projects.length, color: 'var(--text)' },
    { label: 'Em Produção', value: projects.filter((p: any) => p.status === 'EM_PRODUCAO').length, color: client.color },
    { label: 'Atrasados', value: projects.filter((p: any) => p.status === 'ATRASADO').length, color: '#ef4444' },
    { label: 'Concluídos', value: projects.filter((p: any) => ['CONCLUIDO', 'APROVADO'].includes(p.status)).length, color: '#22c55e' },
  ]

  return (
    <div style={{ padding: '28px 24px' }}>
      {/* Back + Header */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => router.push('/clientes')}
          className="btn-secondary"
          style={{ marginBottom: 16, fontSize: 13, padding: '7px 14px' }}
        >
          ← Voltar aos Clientes
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: client.color + '22',
            border: `2px solid ${client.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            fontSize: 24, fontWeight: 800, color: client.color,
          }}>
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{client.name}</h1>
            {client.description && <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 0' }}>{client.description}</p>}
          </div>

          {session?.role === 'GESTOR' && (
            <a
              href={`/projetos/novo?clientId=${id}`}
              className="btn-primary"
              style={{ flexShrink: 0 }}
            >
              + Criar Projeto
            </a>
          )}
        </div>
      </div>

      {/* Contact info card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 14px' }}>Contacto</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Pessoa de Contacto
            </div>
            <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{client.contactName || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Função / Cargo
            </div>
            <div style={{ fontSize: 14, color: 'var(--text)' }}>{client.contactFunction || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Telefone
            </div>
            <div style={{ fontSize: 14, color: 'var(--text)' }}>{client.contactPhone || '—'}</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }} className="stats-row">
        {stats.map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Projects list */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}>
          Projetos
          <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>{projects.length}</span>
        </h2>

        {projects.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>Nenhum projeto para este cliente</p>
            {session?.role === 'GESTOR' && (
              <a href={`/projetos/novo?clientId=${id}`} className="btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
                + Criar Primeiro Projeto
              </a>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }} className="card-grid">
            {projects.map((p: any) => {
              const days = daysUntil(p.deadline)
              return (
                <div
                  key={p.id}
                  className="card"
                  style={{ cursor: 'pointer', padding: 18 }}
                  onClick={() => router.push(`/projetos/${p.id}`)}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <StatusBadge status={p.status} />
                        <PriorityBadge priority={p.priority} />
                      </div>
                    </div>
                  </div>

                  {/* Deadline */}
                  <div style={{ fontSize: 12, color: days < 0 ? '#ef4444' : days <= 3 ? '#f59e0b' : 'var(--text-muted)', marginBottom: 10, fontWeight: days <= 3 ? 600 : 400 }}>
                    📅 {formatDate(p.deadline)}
                    {days < 0 && <span style={{ marginLeft: 4, fontSize: 11 }}>{Math.abs(days)}d atraso</span>}
                    {days >= 0 && days <= 3 && <span style={{ marginLeft: 4, fontSize: 11 }}>faltam {days}d</span>}
                  </div>

                  {/* Progress */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Progresso</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{p.progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${p.progress}%`, background: client.color }} />
                    </div>
                  </div>

                  {/* Assignee */}
                  {p.assignedToName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{p.assignedToAvatar}</div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.assignedToName}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Não delegado</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
