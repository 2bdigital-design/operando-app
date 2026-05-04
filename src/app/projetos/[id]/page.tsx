'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { formatDate, formatDateTime, STATUS_LABELS } from '@/lib/utils'
import { ProjectStatus, TaskStatus } from '@/lib/db'

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

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDENTE: 'Pendente',
  EM_PRODUCAO: 'Em Produção',
  EM_REVISAO: 'Em Revisão',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
}

const TASK_STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  PENDENTE:    { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8' },
  EM_PRODUCAO: { bg: 'rgba(6,182,212,0.15)',   text: '#22d3ee' },
  EM_REVISAO:  { bg: 'rgba(245,158,11,0.15)',   text: '#fbbf24' },
  APROVADO:    { bg: 'rgba(34,197,94,0.15)',    text: '#4ade80' },
  REPROVADO:   { bg: 'rgba(239,68,68,0.15)',    text: '#f87171' },
}

const steps: ProjectStatus[] = ['DISPONIVEL','DELEGADO','CONFIRMADO','EM_PRODUCAO','EM_REVISAO','APROVADO','CONCLUIDO']

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const c = TASK_STATUS_COLORS[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.text,
    }}>
      {TASK_STATUS_LABELS[status]}
    </span>
  )
}

export default function ProjetoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [editProgress, setEditProgress] = useState(false)
  const [showDelegate, setShowDelegate] = useState(false)
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [delegateToIds, setDelegateToIds] = useState<string[]>([])
  const [newLink, setNewLink] = useState({ label: '', url: '' })
  const [addingLink, setAddingLink] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Task modal state
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [taskForm, setTaskForm] = useState({
    name: '', description: '', assignedToId: '',
    deadline: '', deadlineTime: '18:00', startTime: '09:00', endTime: '11:00',
  })
  const [savingTask, setSavingTask] = useState(false)
  const [taskError, setTaskError] = useState('')

  // Reject task state
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null)
  const [rejectForm, setRejectForm] = useState({ comment: '', newDeadline: '' })

  // Result link state
  const [resultLinkTaskId, setResultLinkTaskId] = useState<string | null>(null)
  const [resultLinkValue, setResultLinkValue] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (!d.error) setSession(d) })
    loadProject()
    loadTasks()
  }, [id])

  async function loadProject() {
    const res = await fetch(`/api/projects/${id}`)
    if (!res.ok) { router.push('/projetos'); return }
    const data = await res.json()
    setProject(data)
    setProgress(data.progress)
    setLoading(false)
  }

  async function loadTasks() {
    const res = await fetch(`/api/tasks?projectId=${id}`)
    if (res.ok) setTasks(await res.json())
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
    // Pre-select already assigned members
    setDelegateToIds(project?.assignedToIds?.length ? project.assignedToIds : [])
    setShowDelegate(true)
    const res = await fetch('/api/users')
    const users = await res.json()
    setColaboradores(users.filter((u: any) => u.role === 'COLABORADOR'))
  }

  function toggleDelegate(uid: string) {
    setDelegateToIds(prev =>
      prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]
    )
  }

  async function doDelegate() {
    if (delegateToIds.length === 0) return
    await fetch(`/api/projects/${id}/delegate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedToIds: delegateToIds }),
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

  async function deleteProject() {
    setDeleting(true)
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    setDeleting(false)
    router.push('/projetos')
  }

  async function removeAttachment(attachmentId: string) {
    await fetch(`/api/projects/${id}/attachments`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attachmentId }),
    })
    loadProject()
  }

  async function createTask() {
    setTaskError('')
    if (!taskForm.name.trim()) { setTaskError('Nome é obrigatório'); return }
    if (!taskForm.deadline) { setTaskError('Prazo é obrigatório'); return }
    setSavingTask(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...taskForm, projectId: id, assignedToId: taskForm.assignedToId || null }),
    })
    const data = await res.json()
    setSavingTask(false)
    if (!res.ok) { setTaskError(data.error || 'Erro ao criar tarefa'); return }
    setShowCreateTask(false)
    setTaskForm({ name: '', description: '', assignedToId: '', deadline: '', deadlineTime: '18:00', startTime: '09:00', endTime: '11:00' })
    loadTasks()
  }

  async function advanceTaskStatus(taskId: string, status: TaskStatus, extra?: { rejectionComment?: string; rejectionNewDeadline?: string }) {
    const res = await fetch(`/api/tasks/${taskId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra }),
    })
    if (res.ok) {
      loadTasks()
      setRejectingTaskId(null)
      setRejectForm({ comment: '', newDeadline: '' })
    } else {
      const d = await res.json()
      alert(d.error || 'Erro ao atualizar status')
    }
  }

  async function saveResultLink(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultLink: resultLinkValue }),
    })
    setResultLinkTaskId(null)
    setResultLinkValue('')
    loadTasks()
  }

  async function deleteTask(taskId: string) {
    if (!window.confirm('Eliminar esta tarefa?')) return
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    loadTasks()
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>A carregar…</div>
  if (!project) return null

  const flow = STATUS_FLOW[project.status as ProjectStatus]
  const isMyProject = (project.assignedToIds ?? [project.assignedToId]).includes(session?.userId)
  const isGestor = session?.role === 'GESTOR'
  const isLider = session?.role === 'LIDER'
  const canApprove = isGestor || isLider
  const currentStep = steps.indexOf(project.status as ProjectStatus)
  const canManageTasks = isGestor || isLider

  // Which tasks are visible to this user
  const visibleTasks = canManageTasks
    ? tasks
    : tasks.filter(t => t.assignedToId === session?.userId)

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => router.back()} className="btn-secondary" style={{ marginTop: 4, fontSize: 13 }}>
          ← Voltar
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{project.name}</h1>
            <StatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span>{project.clientName || project.client}</span>
            <span>Criado em {formatDate(project.createdAt)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {isGestor && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: '#fca5a5', fontWeight: 600 }}
            >
              🗑 Eliminar
            </button>
          )}
          {isGestor && project.status === 'DISPONIVEL' && (
            <button onClick={openDelegate} className="btn-primary">Delegar</button>
          )}
          {isMyProject && project.status === 'DELEGADO' && (
            <button onClick={confirm} className="btn-primary" disabled={actionLoading}>
              {actionLoading ? 'A confirmar…' : 'Confirmar Responsabilidade'}
            </button>
          )}
          {isMyProject && ['CONFIRMADO', 'EM_PRODUCAO'].includes(project.status) && flow?.next && (
            <button onClick={() => advance(flow.next!)} className="btn-primary" disabled={actionLoading}>
              {actionLoading ? '…' : flow.btnLabel}
            </button>
          )}
          {canApprove && ['EM_REVISAO', 'APROVADO'].includes(project.status) && flow?.next && (
            <button onClick={() => advance(flow.next!)} className="btn-primary" disabled={actionLoading}
              style={{ background: project.status === 'APROVADO' ? '#16a34a' : undefined }}>
              {actionLoading ? '…' : flow.btnLabel}
            </button>
          )}
          {canApprove && project.status === 'EM_REVISAO' && (
            <button onClick={() => advance('EM_PRODUCAO')} className="btn-secondary" disabled={actionLoading}>Devolver</button>
          )}
        </div>
      </div>

      {/* Status pipeline */}
      <div className="card" style={{ marginBottom: 20, padding: '20px 24px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', minWidth: 480 }}>
          <div style={{ position: 'absolute', top: 13, left: '3.5%', right: '3.5%', height: 2, background: 'var(--glass-border)' }} />
          <div style={{ position: 'absolute', top: 13, left: '3.5%', height: 2, background: '#1d4ed8', width: `${Math.max(0, currentStep / (steps.length - 1) * 93)}%`, transition: 'width 0.4s' }} />
          {steps.map((s, i) => {
            const done = project.status !== 'ATRASADO' && i < currentStep
            const active = project.status !== 'ATRASADO' && i === currentStep
            return (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 1 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, marginBottom: 6,
                  background: done ? '#1d4ed8' : active ? 'rgba(29,78,216,0.2)' : 'var(--glass)',
                  color: done ? 'white' : active ? '#60a5fa' : '#64748b',
                  border: active ? '2px solid #3b82f6' : done ? 'none' : '2px solid var(--glass-border)',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 10, color: active ? '#60a5fa' : done ? '#93c5fd' : '#64748b', fontWeight: active ? 700 : 400, textAlign: 'center', lineHeight: 1.3 }}>
                  {STATUS_LABELS[s]}
                </span>
              </div>
            )
          })}
        </div>
        {project.status === 'ATRASADO' && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.12)', borderRadius: 8, color: '#fca5a5', fontSize: 13, fontWeight: 600, textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
            Prazo ultrapassado — projeto atrasado
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20 }} className="detail-grid">
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Details */}
          <div className="card">
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: 'var(--text)' }}>Detalhes</h2>
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
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 14, color: 'var(--text)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Attachments */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Anexos / Links
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-faint)', marginLeft: 8 }}>{project.attachments?.length || 0}</span>
              </h2>
            </div>

            {project.attachments?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {project.attachments.map((att: any) => (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(6,12,26,0.4)', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{att.label}</div>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1d4ed8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {att.url}
                      </a>
                    </div>
                    <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#93c5fd', background: 'rgba(29,78,216,0.2)', border: '1px solid rgba(29,78,216,0.3)', borderRadius: 6, padding: '4px 10px', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>
                      Abrir
                    </a>
                    {isGestor && (
                      <button onClick={() => removeAttachment(att.id)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#fca5a5', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 160px', minWidth: 130 }}>
                <label className="label" style={{ fontSize: 11 }}>Etiqueta</label>
                <input className="input" style={{ fontSize: 13 }} placeholder="Ex: Briefing…" value={newLink.label} onChange={e => setNewLink(p => ({ ...p, label: e.target.value }))} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAttachment())} />
              </div>
              <div style={{ flex: 1, minWidth: 130 }}>
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
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text)' }}>Progresso</h2>
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
                    <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Conclusão</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>{project.progress}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 10 }}>
                    <div className="progress-fill" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TASKS SECTION ── */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Tarefas
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-faint)', marginLeft: 8 }}>{visibleTasks.length}</span>
              </h2>
              {canManageTasks && (
                <button onClick={() => { setShowCreateTask(true); if (colaboradores.length === 0) { fetch('/api/users').then(r => r.json()).then(d => setColaboradores(d.filter((u: any) => u.role === 'COLABORADOR'))) } }} className="btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}>
                  + Criar Tarefa
                </button>
              )}
            </div>

            {visibleTasks.length === 0 ? (
              <p style={{ color: 'var(--text-faint)', fontSize: 13, margin: 0, textAlign: 'center', padding: '20px 0' }}>
                {canManageTasks ? 'Nenhuma tarefa criada ainda.' : 'Não tens tarefas atribuídas neste projeto.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visibleTasks.map((t: any) => {
                  const isMyTask = session?.userId === t.assignedToId
                  return (
                    <div key={t.id} style={{ background: 'rgba(6,12,26,0.4)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: 14 }}>
                      {/* Task header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14, marginBottom: 4 }}>{t.name}</div>
                          {t.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{t.description}</div>}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <TaskStatusBadge status={t.status} />
                            {t.assignedToName && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                                <div className="avatar" style={{ width: 18, height: 18, fontSize: 8 }}>{t.assignedToAvatar}</div>
                                {t.assignedToName}
                              </span>
                            )}
                            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                              {t.deadline} · {t.startTime}–{t.endTime}
                            </span>
                          </div>
                        </div>
                        {canManageTasks && (
                          <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 16, padding: '0 4px', flexShrink: 0 }}>×</button>
                        )}
                      </div>

                      {/* Rejection info */}
                      {t.rejectionComment && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 12 }}>
                          <span style={{ color: '#f87171', fontWeight: 600 }}>Reprovado: </span>
                          <span style={{ color: 'var(--text-muted)' }}>{t.rejectionComment}</span>
                          {t.rejectionNewDeadline && (
                            <span style={{ color: 'var(--text-muted)' }}> · Novo prazo: {t.rejectionNewDeadline}</span>
                          )}
                        </div>
                      )}

                      {/* Result link */}
                      {t.resultLink && (
                        <div style={{ marginBottom: 8 }}>
                          <a href={t.resultLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            🔗 {t.resultLink}
                          </a>
                        </div>
                      )}

                      {/* Edit result link */}
                      {(isMyTask || canManageTasks) && resultLinkTaskId === t.id && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <input
                            className="input"
                            style={{ flex: 1, fontSize: 13 }}
                            placeholder="https://link-do-resultado…"
                            value={resultLinkValue}
                            onChange={e => setResultLinkValue(e.target.value)}
                          />
                          <button onClick={() => saveResultLink(t.id)} className="btn-primary" style={{ padding: '7px 12px', fontSize: 12 }}>Guardar</button>
                          <button onClick={() => setResultLinkTaskId(null)} className="btn-secondary" style={{ padding: '7px 12px', fontSize: 12 }}>×</button>
                        </div>
                      )}

                      {/* Reject form */}
                      {canManageTasks && rejectingTaskId === t.id && (
                        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 12, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div>
                            <label className="label" style={{ fontSize: 11 }}>Motivo da Reprovação *</label>
                            <input className="input" style={{ fontSize: 13 }} placeholder="Descreva o motivo…" value={rejectForm.comment} onChange={e => setRejectForm(p => ({ ...p, comment: e.target.value }))} />
                          </div>
                          <div>
                            <label className="label" style={{ fontSize: 11 }}>Novo Prazo *</label>
                            <input type="date" className="input" style={{ fontSize: 13 }} value={rejectForm.newDeadline} onChange={e => setRejectForm(p => ({ ...p, newDeadline: e.target.value }))} />
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setRejectingTaskId(null)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Cancelar</button>
                            <button
                              onClick={() => advanceTaskStatus(t.id, 'REPROVADO', { rejectionComment: rejectForm.comment, rejectionNewDeadline: rejectForm.newDeadline })}
                              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: '#fca5a5', fontWeight: 600 }}
                              disabled={!rejectForm.comment || !rejectForm.newDeadline}
                            >
                              Confirmar Reprovação
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {/* Collaborator: PENDENTE → EM_PRODUCAO */}
                        {isMyTask && t.status === 'PENDENTE' && (
                          <button onClick={() => advanceTaskStatus(t.id, 'EM_PRODUCAO')} style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#22d3ee', fontWeight: 600 }}>
                            Iniciar
                          </button>
                        )}

                        {/* Collaborator: EM_PRODUCAO → EM_REVISAO */}
                        {isMyTask && t.status === 'EM_PRODUCAO' && (
                          <>
                            <button
                              onClick={() => { setResultLinkTaskId(t.id); setResultLinkValue(t.resultLink || '') }}
                              style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#93c5fd', fontWeight: 600 }}
                            >
                              {t.resultLink ? 'Editar Link' : 'Adicionar Link'}
                            </button>
                            <button onClick={() => advanceTaskStatus(t.id, 'EM_REVISAO')} style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>
                              Enviar p/ Revisão
                            </button>
                          </>
                        )}

                        {/* Manager: EM_REVISAO → APROVADO or REPROVADO */}
                        {canManageTasks && t.status === 'EM_REVISAO' && (
                          <>
                            <button onClick={() => advanceTaskStatus(t.id, 'APROVADO')} style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#4ade80', fontWeight: 600 }}>
                              ✓ Aprovar
                            </button>
                            <button onClick={() => { setRejectingTaskId(t.id); setRejectForm({ comment: '', newDeadline: '' }) }} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#f87171', fontWeight: 600 }}>
                              ✕ Reprovar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="card">
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: 'var(--text)' }}>Comentários</h2>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <textarea className="input" rows={2} placeholder="Adicionar comentário…" value={comment} onChange={e => setComment(e.target.value)} style={{ resize: 'none', flex: 1 }} />
              <button onClick={postComment} className="btn-primary" disabled={!comment.trim() || posting} style={{ alignSelf: 'flex-end' }}>
                {posting ? '…' : 'Enviar'}
              </button>
            </div>
            {project.comments?.length === 0 && <p style={{ color: 'var(--text-faint)', fontSize: 13, margin: 0 }}>Sem comentários ainda.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {project.comments?.map((c: any) => (
                <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                  <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>{c.authorAvatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.authorName}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{formatDateTime(c.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text)', background: 'rgba(6,12,26,0.4)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--glass-border)' }}>{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Timeline */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: 'var(--text)' }}>Histórico</h2>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {project.logs?.map((log: any, i: number) => (
              <div key={log.id} style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1d4ed8', marginTop: 3, flexShrink: 0 }} />
                  {i < project.logs.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--glass-border)', minHeight: 20 }} />}
                </div>
                <div style={{ paddingBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{log.action}</div>
                  {log.detail && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{log.detail}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{log.userName} · {formatDateTime(log.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="modal-overlay" onClick={() => setShowCreateTask(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', color: 'var(--text)' }}>Nova Tarefa</h2>

            {taskError && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#fca5a5', fontSize: 13 }}>
                {taskError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Nome da Tarefa *</label>
                <input className="input" placeholder="Ex: Design de banner" value={taskForm.name} onChange={e => setTaskForm(p => ({ ...p, name: e.target.value }))} />
              </div>

              <div>
                <label className="label">Descrição</label>
                <textarea className="input" rows={2} style={{ resize: 'none' }} placeholder="Detalhes da tarefa…" value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div>
                <label className="label">Atribuir a Colaborador</label>
                <select className="select" value={taskForm.assignedToId} onChange={e => setTaskForm(p => ({ ...p, assignedToId: e.target.value }))}>
                  <option value="">Sem atribuição</option>
                  {colaboradores.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Data Limite *</label>
                <input type="date" className="input" value={taskForm.deadline} onChange={e => setTaskForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div>
                  <label className="label">Hora Limite</label>
                  <input type="time" className="input" value={taskForm.deadlineTime} onChange={e => setTaskForm(p => ({ ...p, deadlineTime: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Início</label>
                  <input type="time" className="input" value={taskForm.startTime} onChange={e => setTaskForm(p => ({ ...p, startTime: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Fim</label>
                  <input type="time" className="input" value={taskForm.endTime} onChange={e => setTaskForm(p => ({ ...p, endTime: e.target.value }))} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowCreateTask(false)} className="btn-secondary">Cancelar</button>
              <button onClick={createTask} className="btn-primary" disabled={savingTask}>
                {savingTask ? 'A criar…' : 'Criar Tarefa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--text)' }}>Eliminar Projeto?</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                Esta ação é <strong style={{ color: '#fca5a5' }}>permanente</strong> e não pode ser desfeita.
              </p>
            </div>
            <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{project.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{project.clientName || project.client}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">Cancelar</button>
              <button
                onClick={deleteProject}
                disabled={deleting}
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14, color: '#fca5a5', fontWeight: 700 }}
              >
                {deleting ? 'A eliminar…' : '🗑 Eliminar Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delegate Modal — multi-select */}
      {showDelegate && (
        <div className="modal-overlay" onClick={() => setShowDelegate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>Delegar Projeto</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 16px' }}>
              Selecione um ou mais colaboradores
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, maxHeight: 280, overflowY: 'auto' }}>
              {colaboradores.length === 0 && (
                <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Nenhum colaborador disponível</p>
              )}
              {colaboradores.map(c => {
                const checked = delegateToIds.includes(c.id)
                return (
                  <label key={c.id} onClick={() => toggleDelegate(c.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    borderRadius: 10, cursor: 'pointer',
                    background: checked ? 'rgba(29,78,216,0.15)' : 'var(--glass)',
                    border: `1px solid ${checked ? '#3b82f6' : 'var(--glass-border)'}`,
                    transition: 'all 0.15s',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${checked ? '#3b82f6' : 'var(--glass-border)'}`,
                      background: checked ? '#3b82f6' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {checked && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div className="avatar" style={{ width: 30, height: 30, fontSize: 12, flexShrink: 0 }}>{c.avatar}</div>
                    <div>
                      <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.email}</div>
                    </div>
                  </label>
                )
              })}
            </div>

            {delegateToIds.length > 0 && (
              <p style={{ color: '#60a5fa', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
                {delegateToIds.length} colaborador{delegateToIds.length > 1 ? 'es' : ''} selecionado{delegateToIds.length > 1 ? 's' : ''}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDelegate(false)} className="btn-secondary">Cancelar</button>
              <button onClick={doDelegate} className="btn-primary" disabled={delegateToIds.length === 0}>
                Delegar {delegateToIds.length > 0 ? `(${delegateToIds.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
