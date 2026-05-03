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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    setDeleting(true)
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    setDeleting(false)
    setConfirmDelete(null)
    loadProjects()
  }

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || p.status === filterStatus
    const matchPriority = !filterPriority || p.priority === filterPriority
    return matchSearch && matchStatus && matchPriority
  })

  const canCreateProject = session?.role === 'GESTOR' || session?.role === 'LIDER'
  const canDelete = session?.role === 'GESTOR'
  const canDelegate = session?.role === 'GESTOR' || session?.role === 'LIDER'

  const projectToDelete = confirmDelete ? projects.find(p => p.id === confirmDelete) : null

  return (
    <div style={{ padding: '28px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0 }}>Projetos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 0' }}>{filtered.length} projeto{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreateProject && (
          <a href="/projetos/novo" className="btn-primary">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 4v16m-8-8h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Novo Projeto
          </a>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          className="input"
          style={{ maxWidth: 260 }}
          placeholder="Pesquisar projetos…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>A carregar…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>Nenhum projeto encontrado</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
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
                        <div
                          style={{ fontWeight: 600, color: 'white', fontSize: 14, cursor: 'pointer' }}
                          onClick={() => router.push(`/projetos/${p.id}`)}
                        >
                          {p.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.client}</div>
                      </td>
                      <td>
                        {p.assignedToName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{p.assignedToAvatar}</div>
                            <span style={{ fontSize: 13 }}>{p.assignedToName}</span>
                          </div>
                        ) : <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>Não delegado</span>}
                      </td>
                      <td>
                        <div style={{ fontSize: 13, color: days < 0 ? '#ef4444' : days <= 3 ? '#f59e0b' : 'var(--text)', fontWeight: days <= 3 ? 600 : 400 }}>
                          {formatDate(p.deadline)}
                        </div>
                        {days < 0 && <div style={{ fontSize: 11, color: '#ef4444' }}>{Math.abs(days)}d atrasado</div>}
                        {days >= 0 && days <= 3 && <div style={{ fontSize: 11, color: '#f59e0b' }}>Faltam {days}d</div>}
                      </td>
                      <td style={{ width: 110 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.progress}%</span>
                        </div>
                      </td>
                      <td><PriorityBadge priority={p.priority} /></td>
                      <td><StatusBadge status={p.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap' }}>
                          <button
                            onClick={() => router.push(`/projetos/${p.id}`)}
                            style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#93c5fd', fontWeight: 600, whiteSpace: 'nowrap' }}
                          >
                            Ver
                          </button>
                          {canDelegate && p.status === 'DISPONIVEL' && (
                            <button
                              onClick={() => openDelegate(p.id)}
                              style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#60a5fa', fontWeight: 600, whiteSpace: 'nowrap' }}
                            >
                              Delegar
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setConfirmDelete(p.id)}
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#fca5a5', fontWeight: 700, lineHeight: 1 }}
                              title="Eliminar projeto (permanente)"
                            >
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
        </div>
      )}

      {/* Delegate Modal */}
      {showDelegate && (
        <div className="modal-overlay" onClick={() => setShowDelegate(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: 'white' }}>Delegar Projeto</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>
              O colaborador receberá uma notificação para confirmar o projeto.
            </p>
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

      {/* Confirm Delete Modal — only GESTOR can see this */}
      {confirmDelete && canDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>🗑️</div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px', color: 'white' }}>Eliminar Projeto?</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Esta ação é permanente e não pode ser desfeita.</p>
              </div>
            </div>
            {projectToDelete && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{projectToDelete.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{projectToDelete.client}</div>
              </div>
            )}
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px' }}>
              Todos os logs e comentários associados também serão eliminados permanentemente.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => deleteProject(confirmDelete)}
                className="btn-danger"
                disabled={deleting}
                style={{ background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' }}
              >
                {deleting ? 'A eliminar…' : '🗑️ Eliminar Permanentemente'}
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
