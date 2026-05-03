'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const ROOM_COLORS = [
  '#2563eb', '#7c3aed', '#0891b2', '#059669',
  '#d97706', '#dc2626', '#db2777', '#4f46e5',
]

interface Room {
  id: string
  name: string
  description: string
  color: string
  memberCount: number
  members: { id: string; name: string; avatar: string }[]
  projectCount: number
  activeCount: number
  overdueCount: number
  createdAt: string
}

export default function SalasPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: '#2563eb', memberIds: [] as string[] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (!d.error) setSession(d) })
    loadRooms()
    fetch('/api/users').then(r => r.json()).then(d => setUsers(d.filter((u: any) => u.role === 'COLABORADOR')))
  }, [])

  async function loadRooms() {
    const res = await fetch('/api/rooms')
    if (res.status === 401) { router.push('/'); return }
    setRooms(await res.json())
    setLoading(false)
  }

  function toggleMember(id: string) {
    setForm(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(id)
        ? prev.memberIds.filter(m => m !== id)
        : [...prev.memberIds, id],
    }))
  }

  async function createRoom() {
    if (!form.name.trim()) return
    setSaving(true)
    await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setShowCreate(false)
    setForm({ name: '', description: '', color: '#2563eb', memberIds: [] })
    loadRooms()
  }

  async function deleteRoom(id: string) {
    if (!confirm('Eliminar esta sala? Os projetos não serão apagados.')) return
    await fetch(`/api/rooms/${id}`, { method: 'DELETE' })
    loadRooms()
  }

  return (
    <div style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0 }}>Salas de Trabalho</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '6px 0 0' }}>
            Organize a sua equipa em espaços de trabalho dedicados
          </p>
        </div>
        {session?.role === 'GESTOR' && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            Nova Sala
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ color: '#64748b', padding: 40, textAlign: 'center' }}>A carregar salas…</div>
      ) : rooms.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 80 }}>
          <div style={{ width: 64, height: 64, background: '#f1f5f9', borderRadius: 16, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #cbd5e1', borderRadius: 6 }} />
          </div>
          <p style={{ color: '#0f172a', fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>Nenhuma sala criada</p>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Crie salas para organizar os projetos da sua equipa</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {rooms.map(room => (
            <div
              key={room.id}
              className="card"
              style={{ overflow: 'hidden', cursor: 'pointer', padding: 0, transition: 'all 0.2s' }}
              onClick={() => router.push(`/salas/${room.id}`)}
            >
              {/* Color bar */}
              <div style={{ height: 6, background: room.color }} />

              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: room.color + '22', border: `1px solid ${room.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 3, background: room.color, opacity: 0.9 }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: 0 }}>{room.name}</h3>
                    </div>
                  </div>
                  {session?.role === 'GESTOR' && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteRoom(room.id) }}
                      style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: '#94a3b8', fontSize: 18, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {room.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>{room.description}</p>
                )}

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Projetos', value: room.projectCount, color: 'var(--text)' },
                    { label: 'Ativos', value: room.activeCount, color: room.color },
                    { label: 'Atrasados', value: room.overdueCount, color: room.overdueCount > 0 ? '#ef4444' : 'var(--text-faint)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(6,12,26,0.5)', borderRadius: 8, padding: '9px 6px', textAlign: 'center', border: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Members */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex' }}>
                    {room.members.slice(0, 5).map((m, i) => (
                      <div key={m.id} className="avatar" style={{ width: 28, height: 28, fontSize: 10, marginLeft: i > 0 ? -8 : 0, border: '2px solid white', zIndex: room.members.length - i }}>
                        {m.avatar}
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {room.memberCount === 0 ? 'Sem membros' : `${room.memberCount} membro${room.memberCount !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 24px' }}>Nova Sala de Trabalho</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label className="label">Nome da Sala *</label>
                <input className="input" placeholder="Ex: Marketing Digital" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>

              <div>
                <label className="label">Descrição</label>
                <textarea className="input" rows={2} style={{ resize: 'none' }} placeholder="Descreva o propósito desta sala…" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div>
                <label className="label">Cor da Sala</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ROOM_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(p => ({ ...p, color: c }))}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', background: c, border: form.color === c ? `3px solid #0f172a` : '3px solid transparent',
                        cursor: 'pointer', outline: 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Adicionar Colaboradores</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                  {users.map(u => (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${form.memberIds.includes(u.id) ? '#dbeafe' : '#e2e8f0'}`, borderRadius: 8, cursor: 'pointer', background: form.memberIds.includes(u.id) ? '#eff6ff' : 'white' }}>
                      <input type="checkbox" checked={form.memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} style={{ accentColor: '#1d4ed8' }} />
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{u.avatar}</div>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
              <button onClick={createRoom} className="btn-primary" disabled={!form.name.trim() || saving}>
                {saving ? 'A criar…' : 'Criar Sala'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
