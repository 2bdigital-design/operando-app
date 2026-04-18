'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AttachmentDraft {
  id: string
  label: string
  url: string
}

export default function NovoProjetoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [rooms, setRooms] = useState<any[]>([])
  const [form, setForm] = useState({
    name: '', client: '', objective: '',
    deadline: '', priority: 'MEDIA', roomId: '',
  })
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([])
  const [newLink, setNewLink] = useState({ label: '', url: '' })

  useEffect(() => {
    fetch('/api/rooms').then(r => r.json()).then(d => { if (!d.error) setRooms(d) })
  }, [])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addAttachment() {
    if (!newLink.url.trim()) return
    setAttachments(prev => [...prev, {
      id: `draft_${Date.now()}`,
      label: newLink.label.trim() || newLink.url.trim(),
      url: newLink.url.trim(),
    }])
    setNewLink({ label: '', url: '' })
  }

  function removeAttachment(id: string) {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, roomId: form.roomId || null, attachments }),
    })
    if (res.ok) {
      const p = await res.json()
      router.push(`/projetos/${p.id}`)
    } else {
      setSaving(false)
      alert('Erro ao criar projeto')
    }
  }

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div style={{ padding: 32, maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 14, color: '#64748b' }}>
          Voltar
        </button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Novo Projeto</h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: '2px 0 0' }}>Preencha os dados do projeto</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Main details */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
            Informações Gerais
          </h2>

          <div>
            <label className="label">Nome do Projeto *</label>
            <input className="input" placeholder="Ex: Website Institucional" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>

          <div>
            <label className="label">Cliente *</label>
            <input className="input" placeholder="Ex: TechCorp Lda" value={form.client} onChange={e => set('client', e.target.value)} required />
          </div>

          <div>
            <label className="label">Objetivo *</label>
            <textarea className="input" rows={3} style={{ resize: 'vertical' }} placeholder="Descreva o objetivo principal do projeto…" value={form.objective} onChange={e => set('objective', e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label className="label">Data Limite *</label>
              <input type="date" className="input" min={minDate} value={form.deadline} onChange={e => set('deadline', e.target.value)} required />
            </div>
            <div>
              <label className="label">Prioridade</label>
              <select className="select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Média</option>
                <option value="BAIXA">Baixa</option>
              </select>
            </div>
            <div>
              <label className="label">Sala de Trabalho</label>
              <select className="select" value={form.roomId} onChange={e => set('roomId', e.target.value)}>
                <option value="">Sem sala</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
            Anexos / Links
            <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b', marginLeft: 8 }}>Adicione quantos quiser</span>
          </h2>

          {/* Existing attachments */}
          {attachments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attachments.map(att => (
                <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1d4ed8', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{att.label}</div>
                    <div style={{ fontSize: 12, color: '#1d4ed8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.url}</div>
                  </div>
                  <button type="button" onClick={() => removeAttachment(att.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#dc2626', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new link */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 200px' }}>
              <label className="label" style={{ fontSize: 12 }}>Nome / Etiqueta</label>
              <input className="input" placeholder="Ex: Briefing, Figma, Drive…" value={newLink.label} onChange={e => setNewLink(p => ({ ...p, label: e.target.value }))} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAttachment())} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label" style={{ fontSize: 12 }}>URL do Link *</label>
              <input className="input" placeholder="https://" value={newLink.url} onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAttachment())} />
            </div>
            <button type="button" onClick={addAttachment} className="btn-secondary" style={{ flexShrink: 0 }} disabled={!newLink.url.trim()}>
              Adicionar
            </button>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'A criar…' : 'Criar Projeto'}
          </button>
        </div>
      </form>
    </div>
  )
}
