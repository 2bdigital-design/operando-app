'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { formatDate, daysUntil } from '@/lib/utils'

export default function SalaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [room, setRoom] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAddProject, setShowAddProject] = useState(false)
  const [availableProjects, setAvailableProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (!d.error) setSession(d) })
    loadRoom()
  }, [id])

  async function loadRoom() {
    const res = await fetch(`/api/rooms/${id}`)
    if (!res.ok) { router.push('/salas'); return }
    setRoom(await res.json())
    setLoading(false)
  }

  async function openAddProject() {
    const res = await fetch('/api/projects')
    const all = await res.json()
    setAvailableProjects(all.filter((p: any) => !p.roomId || p.roomId !== id))
    setShowAddProject(true)
  }

  async function assignProject() {
    if (!selectedProject) return
    await fetch(`/api/projects/${selectedProject}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: id }),
    })
    setShowAddProject(false)
    setSelectedProject('')
    loadRoom()
  }

  if (loading) return <div style={{ padding: 32, color: '#64748b' }}>A carregar…</div>
  if (!room) return null

  const projects = room.projects || []
  const filtered = filterStatus ? projects.filter((p: any) => p.status === filterStatus) : projects

  const stats = [
    { label: 'Total', value: projects.length },
    { label: 'Em Produção', value: projects.filter((p: any) => p.status === 'EM_PRODUCAO').length },
    { label: 'Atrasados', value: projects.filter((p: any) => p.status === 'ATRASADO').length },
    { label: 'Concluídos', value: projects.filter((p: any) => p.status === 'CONCLUIDO').length },
  ]

  return (
    <div style={{ padding: 32 }}>
      {/* Back + Header */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => router.push('/salas')} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, marginBottom: 16, color: '#64748b', fontWeight: 500 }}>
          Voltar às Salas
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: room.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 24, height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.4)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>{room.name}</h1>
            {room.description && <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>{room.description}</p>}
          </div>

          {session?.role === 'GESTOR' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={openAddProject} className="btn-secondary">Associar Projeto</button>
              <a href="/projetos/novo" className="btn-primary">Novo Projeto</a>
            </div>
          )}
        </div>
      </div>

      {/* Members + Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 24 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {stats.map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.label === 'Atrasados' && s.value > 0 ? '#dc2626' : s.label === 'Em Produção' ? room.color : '#0f172a' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Members */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>Membros</h3>
            <span style={{ fontSize: 12, color: '#64748b' }}>{room.members?.length || 0}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {room.members?.length === 0 && <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Nenhum membro adicionado</p>}
            {room.members?.map((m: any) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, background: room.color }}>{m.avatar}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{m.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Projetos desta sala
            <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b', marginLeft: 8 }}>{filtered.length}</span>
          </h2>
          <select className="select" style={{ width: 'auto', fontSize: 13 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="DISPONIVEL">Disponível</option>
            <option value="DELEGADO">Delegado</option>
            <option value="EM_PRODUCAO">Em Produção</option>
            <option value="EM_REVISAO">Em Revisão</option>
            <option value="ATRASADO">Atrasado</option>
            <option value="CONCLUIDO">Concluído</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            Nenhum projeto nesta sala ainda
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Projeto</th>
                <th>Responsável</th>
                <th>Prazo</th>
                <th>Progresso</th>
                <th>Prioridade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => {
                const days = daysUntil(p.deadline)
                return (
                  <tr key={p.id} onClick={() => router.push(`/projetos/${p.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.client}</div>
                    </td>
                    <td>
                      {p.assignedToName
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="avatar" style={{ width: 26, height: 26, fontSize: 10, background: room.color }}>{p.assignedToAvatar}</div>
                            <span style={{ fontSize: 13 }}>{p.assignedToName}</span>
                          </div>
                        : <span style={{ color: '#94a3b8', fontSize: 13 }}>—</span>}
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
                          <div className="progress-fill" style={{ width: `${p.progress}%`, background: room.color }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{p.progress}%</span>
                      </div>
                    </td>
                    <td><PriorityBadge priority={p.priority} /></td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add project modal */}
      {showAddProject && (
        <div className="modal-overlay" onClick={() => setShowAddProject(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Associar Projeto à Sala</h2>
            <label className="label">Selecionar Projeto</label>
            <select className="select" value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{ marginBottom: 20 }}>
              <option value="">Escolher projeto…</option>
              {availableProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.client}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddProject(false)} className="btn-secondary">Cancelar</button>
              <button onClick={assignProject} className="btn-primary" disabled={!selectedProject}>Associar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
