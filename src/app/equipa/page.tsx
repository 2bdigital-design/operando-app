'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDate } from '@/lib/utils'

interface PerfStats {
  userId: string
  name: string
  avatar: string
  email: string
  totalPoints: number
  monthlyPoints: number
  total: number
  concluidos: number
  atrasados: number
  emProducao: number
  onTime: number
  late: number
  taxa: number
}

function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const color = value >= 500 ? '#22c55e' : value >= 200 ? '#3b82f6' : value >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(59,130,246,0.1)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s ease', boxShadow: `0 0 6px ${color}80` }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 40, textAlign: 'right' }}>{value}pts</span>
    </div>
  )
}

function getMedalEmoji(rank: number) {
  if (rank === 0) return '🥇'
  if (rank === 1) return '🥈'
  if (rank === 2) return '🥉'
  return `#${rank + 1}`
}

export default function EquipaPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [perfStats, setPerfStats] = useState<PerfStats[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'membros' | 'desempenho'>('membros')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'COLABORADOR' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [perfMonth, setPerfMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.error) setSession(d)
      else router.push('/')
    })
    loadData()
  }, [])

  useEffect(() => {
    loadPerf()
  }, [perfMonth])

  async function loadData() {
    const [u, p] = await Promise.all([
      fetch('/api/users').then(r => {
        if (r.status === 401) { router.push('/'); return [] }
        return r.json()
      }),
      fetch('/api/projects').then(r => r.json()),
    ])
    setUsers(u)
    setProjects(p)
    setLoading(false)
  }

  async function loadPerf() {
    const res = await fetch(`/api/performance?month=${perfMonth}`)
    if (res.ok) {
      const data = await res.json()
      setPerfStats(Array.isArray(data) ? data : [])
    }
  }

  async function createMember() {
    setFormError('')
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError('Todos os campos são obrigatórios')
      return
    }
    if (form.password.length < 6) {
      setFormError('A password deve ter pelo menos 6 caracteres')
      return
    }
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setFormError(data.error || 'Erro ao criar membro'); return }
    setShowAdd(false)
    setForm({ name: '', email: '', password: '', role: 'COLABORADOR' })
    loadData()
  }

  async function deleteMember(userId: string) {
    await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setConfirmDelete(null)
    loadData()
  }

  const canManage = session?.role === 'GESTOR'
  const nonGestorUsers = users.filter(u => u.role !== 'GESTOR')
  const colaboradores = users.filter(u => u.role === 'COLABORADOR')
  const lideres = users.filter(u => u.role === 'LIDER')
  const supervisores = users.filter(u => u.role === 'SUPERVISOR')

  // Sort perfStats by totalPoints desc
  const sortedPerf = [...perfStats].sort((a, b) => b.totalPoints - a.totalPoints)
  const maxPoints = sortedPerf.length > 0 ? Math.max(sortedPerf[0].totalPoints, 100) : 100

  return (
    <div style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0 }}>Equipa</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 0' }}>
            {nonGestorUsers.length} membro{nonGestorUsers.length !== 1 ? 's' : ''} ·{' '}
            {colaboradores.length} colaborador{colaboradores.length !== 1 ? 'es' : ''} ·{' '}
            {lideres.length > 0 && `${lideres.length} líder${lideres.length !== 1 ? 'es' : ''} · `}
            {supervisores.length > 0 && `${supervisores.length} supervisor${supervisores.length !== 1 ? 'es' : ''}`}
          </p>
        </div>
        {canManage && (
          <button onClick={() => { setShowAdd(true); setFormError('') }} className="btn-primary">
            + Adicionar Membro
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--glass-border)', paddingBottom: 0 }}>
        {[
          { id: 'membros', label: 'Membros da Equipa' },
          { id: 'desempenho', label: 'Desempenho & Pontuação' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === tab.id ? '#60a5fa' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.18s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>A carregar…</p>
        </div>
      ) : activeTab === 'membros' ? (
        /* ─── MEMBROS TAB ─── */
        <div>
          {nonGestorUsers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>Nenhum membro ainda</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px' }}>Adicione membros à sua equipa</p>
              {canManage && <button onClick={() => setShowAdd(true)} className="btn-primary">Adicionar Membro</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {nonGestorUsers.map(user => {
                const myProjects = projects.filter(p => p.assignedToId === user.id)
                const ativos = myProjects.filter(p => ['EM_PRODUCAO', 'CONFIRMADO', 'EM_REVISAO'].includes(p.status))
                const atrasados = myProjects.filter(p => p.status === 'ATRASADO')
                const concluidos = myProjects.filter(p => ['CONCLUIDO', 'APROVADO'].includes(p.status))
                const perf = perfStats.find(p => p.userId === user.id)
                const roleLabel = user.role === 'LIDER' ? 'Líder' : user.role === 'SUPERVISOR' ? 'Supervisor' : 'Colaborador'
                const roleColor = user.role === 'LIDER' ? 'rgba(245,158,11,0.15)' : user.role === 'SUPERVISOR' ? 'rgba(168,85,247,0.15)' : 'rgba(59,130,246,0.15)'
                const roleTextColor = user.role === 'LIDER' ? '#fcd34d' : user.role === 'SUPERVISOR' ? '#d8b4fe' : '#93c5fd'

                return (
                  <div key={user.id} className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div className="avatar" style={{ width: 46, height: 46, fontSize: 15 }}>{user.avatar}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: roleColor, color: roleTextColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {roleLabel}
                        </span>
                        {canManage && (
                          <button
                            onClick={() => setConfirmDelete(user.id)}
                            style={{ background: 'none', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: '#fca5a5', fontWeight: 500 }}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                      {[
                        { label: 'Ativos', value: ativos.length, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                        { label: 'Atrasados', value: atrasados.length, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                        { label: 'Concluídos', value: concluidos.length, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center', background: s.bg, borderRadius: 8, padding: '8px 0', border: `1px solid ${s.color}30` }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Points */}
                    {user.role === 'COLABORADOR' && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pontuação Total</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#fcd34d' }}>⭐ {user.points || 0} pts</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${Math.min(100, ((user.points || 0) / 1000) * 100)}%`, background: 'linear-gradient(90deg, #f59e0b, #fcd34d)' }} />
                        </div>
                      </div>
                    )}

                    {/* Active projects */}
                    {ativos.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                          Projetos ativos
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {ativos.slice(0, 3).map(p => (
                            <div
                              key={p.id}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--glass-border)', cursor: 'pointer' }}
                              onClick={() => router.push(`/projetos/${p.id}`)}
                            >
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{p.name}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Prazo: {formatDate(p.deadline)}</div>
                              </div>
                              <StatusBadge status={p.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* ─── DESEMPENHO TAB ─── */
        <div>
          {/* Month picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Mês:</label>
            <input
              type="month"
              value={perfMonth}
              onChange={e => setPerfMonth(e.target.value)}
              className="input"
              style={{ width: 'auto', padding: '8px 12px' }}
            />
            <button onClick={() => window.print()} className="btn-secondary" style={{ marginLeft: 'auto' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
              Imprimir Relatório
            </button>
          </div>

          {sortedPerf.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Nenhum dado de desempenho para este mês.</p>
            </div>
          ) : (
            <>
              {/* Ranking cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
                {sortedPerf.map((s, idx) => (
                  <div key={s.userId} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                    {/* Rank badge */}
                    <div style={{
                      position: 'absolute', top: 12, right: 12,
                      fontSize: idx < 3 ? 22 : 14,
                      fontWeight: 700,
                      color: idx === 0 ? '#fcd34d' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b87333' : 'var(--text-faint)',
                    }}>
                      {getMedalEmoji(idx)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div className="avatar" style={{ width: 42, height: 42, fontSize: 14 }}>{s.avatar}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email}</div>
                      </div>
                    </div>

                    <ScoreBar value={s.totalPoints} max={maxPoints} />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 14 }}>
                      {[
                        { label: 'Projetos', value: s.total, color: 'var(--text)' },
                        { label: 'Concluídos', value: s.concluidos, color: '#22c55e' },
                        { label: 'A tempo', value: s.onTime, color: '#3b82f6' },
                        { label: 'Atrasados', value: s.atrasados, color: '#ef4444' },
                      ].map(item => (
                        <div key={item.label} style={{ textAlign: 'center', padding: '8px', background: 'rgba(6,12,26,0.5)', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Taxa de conclusão</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: s.taxa >= 80 ? '#22c55e' : s.taxa >= 50 ? '#f59e0b' : '#ef4444' }}>{s.taxa}%</span>
                    </div>
                    <div className="progress-bar" style={{ marginTop: 4 }}>
                      <div className="progress-fill" style={{ width: `${s.taxa}%`, background: s.taxa >= 80 ? 'linear-gradient(90deg,#22c55e,#4ade80)' : s.taxa >= 50 ? 'linear-gradient(90deg,#f59e0b,#fcd34d)' : 'linear-gradient(90deg,#ef4444,#f87171)' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Full table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: 0 }}>Tabela Completa de Desempenho</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="perf-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Colaborador</th>
                        <th>Pontos Totais</th>
                        <th>Pontos Mês</th>
                        <th>Projectos</th>
                        <th>Concluídos</th>
                        <th>A Tempo</th>
                        <th>Atrasados</th>
                        <th>Taxa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPerf.map((s, idx) => (
                        <tr key={s.userId}>
                          <td style={{ fontWeight: 700, color: idx === 0 ? '#fcd34d' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b87333' : 'var(--text-faint)' }}>
                            {getMedalEmoji(idx)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{s.avatar}</div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{s.email}</div>
                              </div>
                            </div>
                          </td>
                          <td><span style={{ fontWeight: 800, color: '#fcd34d' }}>⭐ {s.totalPoints}</span></td>
                          <td><span style={{ fontWeight: 700, color: s.monthlyPoints >= 0 ? '#22c55e' : '#ef4444' }}>{s.monthlyPoints >= 0 ? '+' : ''}{s.monthlyPoints}</span></td>
                          <td>{s.total}</td>
                          <td style={{ color: '#22c55e', fontWeight: 600 }}>{s.concluidos}</td>
                          <td style={{ color: '#3b82f6', fontWeight: 600 }}>{s.onTime}</td>
                          <td style={{ color: s.atrasados > 0 ? '#ef4444' : 'var(--text)', fontWeight: s.atrasados > 0 ? 700 : 400 }}>{s.atrasados}</td>
                          <td>
                            <span style={{
                              fontWeight: 700,
                              color: s.taxa >= 80 ? '#22c55e' : s.taxa >= 50 ? '#f59e0b' : '#ef4444',
                              background: s.taxa >= 80 ? 'rgba(34,197,94,0.1)' : s.taxa >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                              padding: '3px 8px', borderRadius: 6,
                            }}>{s.taxa}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add Member Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: 'white' }}>Adicionar Membro</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>O membro poderá entrar com estas credenciais</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Função</label>
                <select
                  className="select"
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                >
                  <option value="COLABORADOR">Colaborador</option>
                  <option value="LIDER">Líder de Projetos</option>
                  <option value="SUPERVISOR">Supervisor</option>
                </select>
                <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '4px 0 0' }}>
                  {form.role === 'LIDER' && '👑 Pode criar projetos e ver estatísticas completas'}
                  {form.role === 'SUPERVISOR' && '👁 Pode ver todos os projetos e estatísticas'}
                  {form.role === 'COLABORADOR' && '🔨 Executa projetos delegados pelo gestor'}
                </p>
              </div>
              <div>
                <label className="label">Nome completo *</label>
                <input
                  className="input"
                  placeholder="Ex: João Fernandes"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  className="input"
                  placeholder="joao@empresa.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Password *</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && createMember()}
                />
              </div>

              {formError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                  {formError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => { setShowAdd(false); setFormError('') }} className="btn-secondary">Cancelar</button>
              <button onClick={createMember} className="btn-primary" disabled={saving}>
                {saving ? 'A criar…' : 'Criar Membro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px', color: 'white' }}>Remover membro?</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 24px' }}>
              O membro perderá o acesso ao sistema. Os projetos atribuídos não serão apagados.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
              <button onClick={() => deleteMember(confirmDelete)} className="btn-danger">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
