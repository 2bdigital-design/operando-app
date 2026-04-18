'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { formatDate, formatDateTime, STATUS_LABELS } from '@/lib/utils'
import { ProjectStatus } from '@/lib/db'

const STATUS_FLOW: Record<ProjectStatus, { next: ProjectStatus | null; btnLabel: string }> = {
  DISPONIVEL: { next: null, btnLabel: '' },
  DELEGADO:   { next: null, btnLabel: '' },
  CONFIRMADO: { next: 'EM_PRODUCAO', btnLabel: 'Iniciar Produção' },
  EM_PRODUCAO: { next: 'EM_REVISAO', btnLabel: 'Enviar para Revisão' },
  EM_REVISAO: { next: 'APROVADO', btnLabel: 'Aprovar' },
  APROVADO:   { next: 'CONCLUIDO', btnLabel: 'Marcar Concluído' },
  CONCLUIDO:  { next: null, btnLabel: '' },
  ATRASADO:   { next: null, btnLabel: '' },
}

const steps: ProjectStatus[] = ['DISPONIVEL','DELEGADO','CONFIRMADO','EM_PRODUCAO','EM_REVISAO','APROVADO','CONCLUIDO']

export default function ProjetoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [editProgress, setEditProgress] = useState(false)
  const [showDelegate, setShowDelegate] = useState(false)
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [delegateTo, setDelegateTo] = useState('')
  const [newLink, setNewLink] = useState({ label: '', url: '' })
  const [addingLink, setAddingLink] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (!d.error) setSession(d) })
    loadProject()
  }, [id])

  async function loadProject() {
    const res = await fetch(`/api/projects/${id}`)
    if (!res.ok) { router.push('/projetos'); return }
    const data = await res.json()
    setProject(data)
    setProgress(data.progress)
    setLoading(false)
  }

  async function confirm() {
    setActionLoading(true)
    await fetch(`/api/projects/${id}/confirm`, { method: 'POST' })
    await loadProject(); setActionLoading(false)
  }

  async function advance(status: ProjectStatus) {
    setActionLoading(true)
    await fetch(`/api/projects/${id}/status`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await loadProject(); setActionLoading(false)
  }

  async function saveProgress() {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress }),
    })
    setEditProgress(false); loadProject()
  }

  async function postComment() {
    if (!comment.trim()) return
    setPosting(true)
    await fetch(`/api/projects/${id}/comment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: comment }),
    })
    setComment(''); setPosting(false); loadProject()
  }

  async function openDelegate() {
    setShowDelegate(true)
    const res = await fetch('/api/users')
    const users = await res.json()
    setColaboradores(users.filter((u: any) => u.role === 'COLABORADOR'))
  }

  async function doDelegate() {
    if (!delegateTo) return
    await fetch(`/api/projects/${id}/delegate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedToId: delegateTo }),
    })
    setShowDelegate(false); loadProject()
  }

  async function addAttachment() {
    if (!newLink.url.trim()) return
    setAddingLink(true)
    await fetch(`/api/projects/${id}/attachments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newLink.label || newLink.url, url: newLink.url }),
    })
    setNewLink({ label: '', url: '' }); setAddingLink(false); loadProject()
  }

  async function removeAttachment(attachmentId: string) {
    await fetch(`/api/projects/${id}/attachments`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attachmentId }),
    })
    loadProject()
  }

  if (loading) return <div style={{ padding: 32, color: '#64748b' }}>A carregar…</div>
  if (!project) return null

  const flow = STATUS_FLOW[project.status as ProjectStatus]
  const isMyProject = session?.userId === project.assignedToId
  const isGestor = session?.role === 'GESTOR'
  const currentStep = steps.indexOf(project.status as ProjectStatus)

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, marginTop: 4, color: '#64748b', fontWeight: 500 }}>
          Voltar
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>{project.name}</h1>
            <StatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#64748b' }}>
            <span>{project.client}</span>
            {project.roomName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: project.roomColor || '#1d4ed8' }} />
                {project.roomName}
              </span>
            )}
            <span>Criado em {formatDate(project.createdAt)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {isGestor && project.status === 'DISPONIVEL' && (
            <button onClick={openDelegate} className="btn-primary">Delegar</button>
          )}
          {isMyProject && project.status === 'DELEGADO' && (
            <button onClick={confirm} className="btn-primary" disabled={actionLoading}>
              {actionLoading ? 'A confirmar…' : 'Confirmar Responsabilidade'}
            </button>
          )}
          {(isMyProject || isGestor) && flow?.next && project.status !== 'DELEGADO' && (
            <button onClick={() => advance(flow.next!)} className="btn-primary" disabled={actionLoading} style={{ background: project.status === 'APROVADO' ? '#16a34a' : undefined }}>
              {actionLoading ? '…' : flow.btnLabel}
            </button>
          )}
          {isGestor && project.status === 'EM_REVISAO' && (
            <button onClick={() => advance('EM_PRODUCAO')} className="btn-secondary" disabled={actionLoading}>Devolver</button>
          )}
        </div>
      </div>

      {/* Status pipeline */}
      <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 13, left: '3.5%', right: '3.5%', height: 2, background: '#f1f5f9' }} />
          <div style={{ position: 'absolute', top: 13, left: '3.5%', height: 2, background: '#1d4ed8', width: `${Math.max(0, currentStep / (steps.length - 1) * 93)}%`, transition: 'width 0.4s' }} />
          {steps.map((s, i) => {
            const done = project.status !== 'ATRASADO' && i < currentStep
            const active = project.status !== 'ATRASADO' && i === currentStep
            return (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 1 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, marginBottom: 6,
                  background: done ? '#1d4ed8' : active ? '#eff6ff' : 'white',
                  color: done ? 'white' : active ? '#1d4ed8' : '#94a3b8',
                  border: active ? '2px solid #1d4ed8' : done ? 'none' : '2px solid #e2e8f0',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 11, color: active ? '#1d4ed8' : done ? '#475569' : '#94a3b8', fontWeight: active ? 700 : 400, textAlign: 'center', lineHeight: 1.3 }}>
                  {STATUS_LABELS[s]}
                </span>
              </div>
            )
          })}
        </div>
        {project.status === 'ATRASADO' && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
            Prazo ultrapassado — projeto atrasado
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Details */}
          <div className="card">
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: '#0f172a' }}>Detalhes</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Objetivo', value: project.objective, full: true },
                { label: 'Data Limite', value: formatDate(project.deadline) },
                { label: 'Criado por', value: project.createdByName },
                { label: 'Responsável', value: project.assignedToName || '—' },
                { label: 'Delegado por', value: project.delegatedByName || '—' },
                { label: 'Confirmado em', value: formatDateTime(project.confirmedAt) },
                { label: 'Concluído em', value: formatDateTime(project.completedAt) },
              ].map(item => (
                <div key={item.label} style={item.full ? { gridColumn: '1/-1' } : {}}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 14, color: '#0f172a' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Attachments */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Anexos / Links
                <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>{project.attachments?.length || 0}</span>
              </h2>
            </div>

            {project.attachments?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {project.attachments.map((att: any) => (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1d4ed8', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{att.label}</div>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1d4ed8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {att.url}
                      </a>
                    </div>
                    <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1d4ed8', background: '#eff6ff', border: 'none', borderRadius: 6, padding: '4px 10px', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>
                      Abrir
                    </a>
                    {isGestor && (
                      <button onClick={() => removeAttachment(att.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#dc2626', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add link form */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: '0 0 180px' }}>
                <label className="label" style={{ fontSize: 11 }}>Etiqueta</label>
                <input className="input" style={{ fontSize: 13 }} placeholder="Ex: Briefing, Drive…" value={newLink.label} onChange={e => setNewLink(p => ({ ...p, label: e.target.value }))} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAttachment())} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label" style={{ fontSize: 11 }}>URL</label>
                <input className="input" style={{ fontSize: 13 }} placeholder="https://" value={newLink.url} onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAttachment())} />
              </div>
              <button onClick={addAttachment} disabled={!newLink.url.trim() || addingLink} className="btn-secondary" style={{ flexShrink: 0 }}>
                {addingLink ? '…' : 'Adicionar'}
              </button>
            </div>
          </div>

          {/* Progress */}
          {['CONFIRMADO','EM_PRODUCAO','EM_REVISAO','APROVADO'].includes(project.status) && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>Progresso</h2>
                {(isMyProject || isGestor) && !editProgress && (
                  <button onClick={() => setEditProgress(true)} style={{ fontSize: 12, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Atualizar
                  </button>
                )}
              </div>
              {editProgress ? (
                <div>
                  <input type="range" min={0} max={100} step={5} value={progress} onChange={e => setProgress(Number(e.target.value))} style={{ width: '100%', marginBottom: 12, accentColor: '#1d4ed8' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#1d4ed8' }}>{progress}%</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setEditProgress(false)} className="btn-secondary" style={{ padding: '6px 12px' }}>Cancelar</button>
                      <button onClick={saveProgress} className="btn-primary" style={{ padding: '6px 12px' }}>Guardar</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>Conclusão</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>{project.progress}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 10 }}>
                    <div className="progress-fill" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="card">
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: '#0f172a' }}>Comentários</h2>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <textarea className="input" rows={2} placeholder="Adicionar comentário…" value={comment} onChange={e => setComment(e.target.value)} style={{ resize: 'none', flex: 1 }} />
              <button onClick={postComment} className="btn-primary" disabled={!comment.trim() || posting} style={{ alignSelf: 'flex-end' }}>
                {posting ? '…' : 'Enviar'}
              </button>
            </div>
            {project.comments?.length === 0 && <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Sem comentários ainda.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {project.comments?.map((c: any) => (
                <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                  <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>{c.authorAvatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{c.authorName}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatDateTime(c.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 14, color: '#374151', background: '#f8fafc', padding: '8px 12px', borderRadius: 8 }}>{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Timeline */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: '#0f172a' }}>Histórico</h2>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {project.logs?.map((log: any, i: number) => (
              <div key={log.id} style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1d4ed8', marginTop: 3, flexShrink: 0 }} />
                  {i < project.logs.length - 1 && <div style={{ width: 2, flex: 1, background: '#e2e8f0', minHeight: 20 }} />}
                </div>
                <div style={{ paddingBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{log.action}</div>
                  {log.detail && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>{log.detail}</div>}
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{log.userName} · {formatDateTime(log.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delegate Modal */}
      {showDelegate && (
        <div className="modal-overlay" onClick={() => setShowDelegate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Delegar Projeto</h2>
            <label className="label">Escolher Colaborador</label>
            <select className="select" value={delegateTo} onChange={e => setDelegateTo(e.target.value)} style={{ marginBottom: 20 }}>
              <option value="">Selecionar…</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDelegate(false)} className="btn-secondary">Cancelar</button>
              <button onClick={doDelegate} className="btn-primary" disabled={!delegateTo}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
