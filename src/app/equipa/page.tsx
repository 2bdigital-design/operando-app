'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDate } from '@/lib/utils'

export default function EquipaPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [u, p] = await Promise.all([
      fetch('/api/users').then(r => { if (r.status === 401) { router.push('/'); return [] } return r.json() }),
      fetch('/api/projects').then(r => r.json()),
    ])
    setUsers(u)
    setProjects(p)
    setLoading(false)
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
    if (!res.ok) { setFormError(data.error || 'Erro ao criar colaborador'); return }
    setShowAdd(false)
    setForm({ name: '', email: '', password: '' })
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

  const colaboradores = users.filter(u => u.role === 'COLABORADOR')

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>Equipa</h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>
            {colaboradores.length} colaborador{colaboradores.length !== 1 ? 'es' : ''} ativo{colaboradores.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => { setShowAdd(true); setFormError('') }} className="btn-primary">
          Adicionar Membro
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#64748b', padding: 40, textAlign: 'center' }}>A carregar…</div>
      ) : colaboradores.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: '#0f172a', fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>Nenhum colaborador ainda</p>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px' }}>Adicione membros à sua equipa para delegar projetos</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary">Adicionar Membro</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {colaboradores.map(user => {
            const myProjects = projects.filter(p => p.assignedToId === user.id)
            const ativos = myProjects.filter(p => ['EM_PRODUCAO','CONFIRMADO'].includes(p.status))
            const atrasados = myProjects.filter(p => p.status === 'ATRASADO')
            const concluidos = myProjects.filter(p => p.status === 'CONCLUIDO')

            return (
              <div key={user.id} className="card">
                {/* Header card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div className="avatar" style={{ width: 48, height: 48, fontSize: 16 }}>{user.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{user.name}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{user.email}</div>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(user.id)}
                    style={{ background: 'none', border: '1px solid #f1f5f9', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#94a3b8', fontWeight: 500 }}
                  >
                    Remover
                  </button>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Ativos',     value: ativos.length,    color: '#1d4ed8', bg: '#eff6ff' },
                    { label: 'Atrasados',  value: atrasados.length, color: '#dc2626', bg: '#fef2f2' },
                    { label: 'Concluídos', value: concluidos.length,color: '#16a34a', bg: '#f0fdf4' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', background: s.bg, borderRadius: 8, padding: '10px 0' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Active projects */}
                {myProjects.filter(p => !['CONCLUIDO','APROVADO'].includes(p.status)).length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      Projetos ativos
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {myProjects.filter(p => !['CONCLUIDO','APROVADO'].includes(p.status)).slice(0, 4).map(p => (
                        <div
                          key={p.id}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f8fafc', cursor: 'pointer' }}
                          onClick={() => router.push(`/projetos/${p.id}`)}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Prazo: {formatDate(p.deadline)}</div>
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

      {/* Add Member Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#0f172a' }}>Adicionar Colaborador</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>O colaborador poderá entrar com estas credenciais</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                  {formError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => { setShowAdd(false); setFormError('') }} className="btn-secondary">Cancelar</button>
              <button onClick={createMember} className="btn-primary" disabled={saving}>
                {saving ? 'A criar…' : 'Criar Colaborador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px', color: '#0f172a' }}>Remover colaborador?</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>
              O colaborador perderá o acesso ao sistema. Os projetos atribuídos não serão apagados.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => deleteMember(confirmDelete)}
                style={{ background: '#dc2626', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
