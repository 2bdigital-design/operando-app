'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { formatDate, daysUntil, STATUS_LABELS } from '@/lib/utils'
import { ProjectStatus } from '@/lib/db'

const ALL_STATUSES: ProjectStatus[] = ['DISPONIVEL','DELEGADO','CONFIRMADO','EM_PRODUCAO','EM_REVISAO','APROVADO','CONCLUIDO','ATRASADO']

function ProjetosContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState(params.get('status') || '')
  const [filterPriority, setFilterPriority] = useState('')
  const [session, setSession] = useState<any>(null)
  const [showDelegate, setShowDelegate] = useState<string | null>(null)
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [delegateTo, setDelegateTo] = useState('')
  const [delegating, setDelegating] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (!d.error) setSession(d) })
    loadProjects()
  }, [])

  async function loadProjects() {
    const res = await fetch('/api/projects')
    if (res.status === 401) { router.push('/'); return }
    const data = await res.json()
    setProjects(data)
    setLoading(false)
  }

  async function openDelegate(projectId: string) {
    setShowDelegate(projectId)
    const res = await fetch('/api/users')
    const users = await res.json()
    setColaboradores(users.filter((u: any) => u.role === 'COLABORADOR'))
  }

  async function doDelegate() {
    if (!delegateTo || !showDelegate) return
    setDelegating(true)
    await fetch(`/api/projects/${showDelegate}/delegate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedToId: delegateTo }),
    })
    setDelegating(false)
    setShowDelegate(null)
    setDelegateTo('')
    loadProjects()
  }

  async function deleteProject(id: string) {
    if (!confirm('Eliminar este projeto?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    loadProjects()
  }

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || p.status === filterStatus
    const matchPriority = !filterPriority || p.priority === filterPriority
    return matchSearch && matchStatus && matchPriority
  })

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>Projetos</h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>{filtered.length} projeto{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {session?.role === 'GESTOR' && (
          <a href="/projetos/novo" className="btn-primary">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 4v16m-8-8h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Novo Projeto
          </a>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 280 }} placeholder="Pesquisar projetos…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select className="select" style={{ width: 'auto' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">Todas as prioridades</option>
          <option value="ALTA">Alta</option>
          <option value="MEDIA">Média</option>
          <option value="BAIXA">Baixa</option>
        </select>
        {(filterStatus || filterPriority || search) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterPriority('') }} className="btn-secondary">
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>A carregar…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 56, height: 56, background: '#f1f5f9', borderRadius: 12, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, border: '2px solid #cbd5e1', borderRadius: 4 }} />
          </div>
          <p style={{ color: '#64748b', margin: 0, fontWeight: 500 }}>Nenhum projeto encontrado</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Projeto / Cliente</th>
                <th>Responsável</th>
                <th>Prazo</th>
                <th>Progresso</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const days = daysUntil(p.deadline)
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, cursor: 'pointer' }} onClick={() => router.push(`/projetos/${p.id}`)}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.client}</div>
                    </td>
                    <td>
                      {p.assignedToName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{p.assignedToAvatar}</div>
                          <span style={{ fontSize: 13 }}>{p.assignedToName}</span>
                        </div>
                      ) : <span style={{ color: '#94a3b8', fontSize: 13 }}>Não delegado</span>}
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: days < 0 ? '#dc2626' : days <= 3 ? '#d97706' : '#0f172a', fontWeight: days <= 3 ? 600 : 400 }}>
                        {formatDate(p.deadline)}
                      </div>
                      {days < 0 && <div style={{ fontSize: 11, color: '#dc2626' }}>{Math.abs(days)}d atrasado</div>}
                      {days >= 0 && days <= 3 && <div style={{ fontSize: 11, color: '#d97706' }}>Faltam {days}d</div>}
                    </td>
                    <td style={{ width: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{p.progress}%</span>
                      </div>
                    </td>
                    <td><PriorityBadge priority={p.priority} /></td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => router.push(`/projetos/${p.id}`)} style={{ background: '#eff6ff', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>
                          Ver
                        </button>
                        {session?.role === 'GESTOR' && p.status === 'DISPONIVEL' && (
                          <button onClick={() => openDelegate(p.id)} style={{ background: '#dbeafe', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#1e40af', fontWeight: 600 }}>
                            Delegar
                          </button>
                        )}
                        {session?.role === 'GESTOR' && (
                          <button onClick={() => deleteProject(p.id)} style={{ background: '#fee2e2', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delegate Modal */}
      {showDelegate && (
        <div className="modal-overlay" onClick={() => setShowDelegate(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Delegar Projeto</h2>
            <label className="label">Escolher Colaborador</label>
            <select className="select" value={delegateTo} onChange={e => setDelegateTo(e.target.value)} style={{ marginBottom: 20 }}>
              <option value="">Selecionar colaborador…</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDelegate(null)} className="btn-secondary">Cancelar</button>
              <button onClick={doDelegate} className="btn-primary" disabled={!delegateTo || delegating}>
                {delegating ? 'A delegar…' : 'Confirmar Delegação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProjetosPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>A carregar…</div>}>
      <ProjetosContent />
    </Suspense>
  )
}
