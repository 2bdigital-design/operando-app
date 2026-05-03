'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const CLIENT_COLORS = [
  '#2563eb', '#7c3aed', '#0891b2', '#059669',
  '#d97706', '#dc2626', '#db2777', '#4f46e5',
]

interface ClientItem {
  id: string
  name: string
  description: string
  color: string
  contactName: string
  contactFunction: string
  contactPhone: string
  projectCount: number
  activeProjects: number
  taskCount: number
  createdAt: string
}

export default function ClientesPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientItem[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', color: '#2563eb',
    contactName: '', contactFunction: '', contactPhone: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (!d.error) setSession(d) })
    loadClients()
  }, [])

  async function loadClients() {
    const res = await fetch('/api/clients')
    if (res.status === 401) { router.push('/'); return }
    setClients(await res.json())
    setLoading(false)
  }

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function createClient() {
    setError('')
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    if (!form.contactName.trim()) { setError('Nome do contacto é obrigatório'); return }
    if (!form.contactFunction.trim()) { setError('Função do contacto é obrigatória'); return }
    if (!form.contactPhone.trim()) { setError('Telefone é obrigatório'); return }
    setSaving(true)
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Erro ao criar cliente'); return }
    setShowCreate(false)
    setForm({ name: '', description: '', color: '#2563eb', contactName: '', contactFunction: '', contactPhone: '' })
    loadClients()
  }

  async function deleteClient(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Eliminar este cliente? Os projetos não serão apagados.')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    loadClients()
  }

  return (
    <div style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Clientes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '6px 0 0' }}>
            Gerir clientes e os seus projetos
          </p>
        </div>
        {session?.role === 'GESTOR' && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            + Novo Cliente
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>A carregar clientes…</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 80 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>Nenhum cliente registado</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
            {session?.role === 'GESTOR' ? 'Crie o primeiro cliente para começar' : 'Ainda não tem clientes associados'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }} className="card-grid">
          {clients.map(client => (
            <div
              key={client.id}
              className="card"
              style={{ overflow: 'hidden', cursor: 'pointer', padding: 0, transition: 'all 0.2s' }}
              onClick={() => router.push(`/clientes/${client.id}`)}
            >
              {/* Color bar */}
              <div style={{ height: 5, background: client.color }} />

              <div style={{ padding: 20 }}>
                {/* Name + delete */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: client.color + '22',
                      border: `1px solid ${client.color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      fontSize: 18, fontWeight: 800, color: client.color,
                    }}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.name}
                      </h3>
                    </div>
                  </div>
                  {session?.role === 'GESTOR' && (
                    <button
                      onClick={(e) => deleteClient(client.id, e)}
                      style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {client.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>{client.description}</p>
                )}

                {/* Contact info */}
                <div style={{ background: 'rgba(6,12,26,0.4)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}>{client.contactName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{client.contactFunction}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📞 {client.contactPhone}</div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Projetos', value: client.projectCount, color: 'var(--text)' },
                    { label: 'Ativos', value: client.activeProjects, color: client.color },
                    { label: 'Tarefas', value: client.taskCount, color: 'var(--text-muted)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(6,12,26,0.5)', borderRadius: 8, padding: '9px 6px', textAlign: 'center', border: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Client Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 24px', color: 'var(--text)' }}>Novo Cliente</h2>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Nome do Cliente *</label>
                <input className="input" placeholder="Ex: TechCorp Lda" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>

              <div>
                <label className="label">Descrição</label>
                <textarea className="input" rows={2} style={{ resize: 'none' }} placeholder="Breve descrição do cliente…" value={form.description} onChange={e => set('description', e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Nome do Contacto *</label>
                  <input className="input" placeholder="Ex: João Silva" value={form.contactName} onChange={e => set('contactName', e.target.value)} />
                </div>
                <div>
                  <label className="label">Função / Cargo *</label>
                  <input className="input" placeholder="Ex: Diretor de Marketing" value={form.contactFunction} onChange={e => set('contactFunction', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Telefone *</label>
                <input className="input" placeholder="Ex: +244 923 456 789" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} />
              </div>

              <div>
                <label className="label">Cor do Cliente</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CLIENT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set('color', c)}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', background: c,
                        border: form.color === c ? '3px solid var(--text)' : '3px solid transparent',
                        cursor: 'pointer', outline: 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
              <button onClick={createClient} className="btn-primary" disabled={saving}>
                {saving ? 'A criar…' : 'Criar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
