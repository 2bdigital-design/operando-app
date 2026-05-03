import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB, addLog, applyScoreEvent, ProjectStatus } from '@/lib/db'

const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DISPONIVEL: ['DELEGADO'],
  DELEGADO: ['CONFIRMADO', 'DISPONIVEL'],
  CONFIRMADO: ['EM_PRODUCAO'],
  EM_PRODUCAO: ['EM_REVISAO', 'ATRASADO'],
  EM_REVISAO: ['APROVADO', 'EM_PRODUCAO'],
  APROVADO: ['CONCLUIDO'],
  CONCLUIDO: [],
  ATRASADO: ['EM_PRODUCAO'],
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const { status } = await req.json()

  const db = readDB()
  const project = db.projects.find(p => p.id === id)
  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  const allowed = ALLOWED_TRANSITIONS[project.status as ProjectStatus] || []
  if (!allowed.includes(status as ProjectStatus)) {
    return NextResponse.json({ error: `Transição inválida: ${project.status} → ${status}` }, { status: 400 })
  }

  // Regras de permissão por papel:
  // - Aprovar (EM_REVISAO→APROVADO) e Concluir (APROVADO→CONCLUIDO): apenas GESTOR ou LIDER
  // - Avançar na produção (CONFIRMADO→EM_PRODUCAO, EM_PRODUCAO→EM_REVISAO): apenas o responsável ou GESTOR/LIDER
  const canApprove = session.role === 'GESTOR' || session.role === 'LIDER'
  const isAssigned = session.userId === project.assignedToId

  if (['APROVADO', 'CONCLUIDO'].includes(status) && !canApprove) {
    return NextResponse.json({ error: 'Apenas GESTOR ou LIDER podem aprovar ou concluir projetos' }, { status: 403 })
  }

  if (['EM_PRODUCAO', 'EM_REVISAO'].includes(status) && !isAssigned && !canApprove) {
    return NextResponse.json({ error: 'Apenas o responsável pelo projeto pode alterar este estado' }, { status: 403 })
  }

  const old = project.status
  project.status = status as ProjectStatus

  if (status === 'CONCLUIDO') {
    project.completedAt = new Date().toISOString()
    // Check if completed on time (before or on deadline, and within 24h of EM_REVISAO→APROVADO→CONCLUIDO)
    const deadline = new Date(project.deadline)
    const now = new Date()
    const onTime = now <= deadline && project.scoredOnTime === null
    applyScoreEvent(db, project, onTime)
  }

  addLog(db, id, session.userId, 'STATUS_ALTERADO', `${old} → ${status}`)
  writeDB(db)
  return NextResponse.json(project)
}
