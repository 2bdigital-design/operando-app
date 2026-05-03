'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface AttachmentDraft {
  id: string
  label: string
  url: string
}

function NovoProjetoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get('clientId') || ''

  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [clientError, setClientError] = useState('')
  const [form, setForm] = useState({
    name: '', client: '', objective: '',
    deadline: '', priority: 'MEDIA', clientId: preselectedClientId,
  })
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([])
  const [newLink, setNewLink] = useState({ label: '', url: '' })

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => {
      if (!d.error) {
        setClients(d)
        // If preselected clientId, auto-fill client name
        if (preselectedClientId) {
          const found = d.find((c: any) => c.id === preselectedClientId)
          if (found) setForm(prev => ({ ...prev, client: found.name }))
        }
      }
    })
  }, [preselectedClientId])

  function set(field: string, value: string) {
    if (field === 'clientId') {
      const found = clients.find(c => c.id === value)
      setForm(prev => ({ ...prev, clientId: value, client: found?.name || '' }))
    } else {
      setForm(prev => ({ ...prev, [field]: value }))
    }
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
    setClientError('')
    if (!form.clientId) {
      setClientError('Selecione um cliente para continuar')
      return
    }
    setSaving(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, attachments }),
    })
    if (res.ok) {
      const p = await res.json()
      router.push(`/projetos/${p.id}`)
    } else {
      const data = await res.json()
      setSaving(false)
      alert(data.error || 'Erro ao criar projeto')
    }
  }

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div style={{ padding: 32, maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()} className="btn-secondary" style={{ padding: '8px 14px' }}>
          ← Voltar
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Novo Projeto</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '2px 0 0' }}>Preencha os dados do projeto</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Main details */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, paddingBottom: 12, borderBottom: '1px solid var(--glass-border)' }}>
            Informações Gerais
          </h2>

          {/* Cliente selector */}
          <div>
            <label className="label">Cliente *</label>
            {clients.length === 0 ? (
              <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: 13, color: '#fca5a5' }}>
                Nenhum cliente disponível.{' '}
                <a href="/clientes" style={{ color: '#93c5fd', textDecoration: 'underline' }}>Criar cliente primeiro →</a>
              </div>
            ) : (
              <>
                <select
                  className="select"
                  value={form.clientId}
                  onChange={e => set('clientId', e.target.value)}
                  required
                >
                  <option value="">Selecionar cliente…</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {clientError && (
                  <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 6 }}>{clientError}</div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="label">Nome do Projeto *</label>
            <input className="input" placeholder="Ex: Website Institucional" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>

          <div>
            <label className="label">Objetivo *</label>
            <textarea className="input" rows={3} style={{ resize: 'vertical' }} placeholder="Descreva o objetivo principal do projeto…" value={form.objective} onChange={e => set('objective', e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
          </div>
        </div>

        {/* Attachments */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, paddingBottom: 12, borderBottom: '1px solid var(--glass-border)' }}>
            Anexos / Links
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-faint)', marginLeft: 8 }}>Opcional</span>
          </h2>

          {attachments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attachments.map(att => (
                <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(6,12,26,0.5)', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1d4ed8', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{att.label}</div>
                    <div style={{ fontSize: 12, color: '#60a5fa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.url}</div>
                  </div>
                  <button type="button" onClick={() => removeAttachment(att.id)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#fca5a5', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 180px', minWidth: 150 }}>
              <label className="label" style={{ fontSize: 12 }}>Nome / Etiqueta</label>
              <input className="input" placeholder="Ex: Briefing, Figma…" value={newLink.label} onChange={e => setNewLink(p => ({ ...p, label: e.target.value }))} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAttachment())} />
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label className="label" style={{ fontSize: 12 }}>URL do Link</label>
              <input className="input" placeholder="https://" value={newLink.url} onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAttachment())} />
            </div>
            <button type="button" onClick={addAttachment} className="btn-secondary" style={{ flexShrink: 0 }} disabled={!newLink.url.trim()}>
              Adicionar
            </button>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12 }} className="btn-row">
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving || !form.clientId}>
            {saving ? 'A criar…' : 'Criar Projeto'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NovoProjetoPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>A carregar…</div>}>
      <NovoProjetoContent />
    </Suspense>
  )
}
