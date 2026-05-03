import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB, applyTaskScoreEvent, TaskStatus } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { status, rejectionComment, rejectionNewDeadline } = body as {
    status: TaskStatus
    rejectionComment?: string
    rejectionNewDeadline?: string
  }

  if (!status) return NextResponse.json({ error: 'status é obrigatório' }, { status: 400 })

  const db = readDB()
  const task = db.tasks.find(t => t.id === id)
  if (!task) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  const isManagerRole = session.role === 'GESTOR' || session.role === 'LIDER'
  const isAssigned = task.assignedToId === session.userId

  const currentStatus = task.status

  // Validate transition
  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    PENDENTE:    ['EM_PRODUCAO'],
    EM_PRODUCAO: ['EM_REVISAO'],
    EM_REVISAO:  ['APROVADO', 'REPROVADO'],
    APROVADO:    [],
    REPROVADO:   ['EM_PRODUCAO'],
  }

  if (!validTransitions[currentStatus].includes(status)) {
    return NextResponse.json(
      { error: `Transição inválida: ${currentStatus} → ${status}` },
      { status: 400 }
    )
  }

  // Permission checks per transition
  if (status === 'EM_PRODUCAO' && currentStatus === 'PENDENTE') {
    if (!isAssigned && !isManagerRole) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
  }

  if (status === 'EM_REVISAO') {
    if (!isAssigned && !isManagerRole) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
  }

  if (status === 'APROVADO' || status === 'REPROVADO') {
    if (!isManagerRole) {
      return NextResponse.json({ error: 'Apenas gestores e líderes podem aprovar ou reprovar tarefas' }, { status: 403 })
    }
  }

  if (status === 'EM_PRODUCAO' && currentStatus === 'REPROVADO') {
    if (!isAssigned && !isManagerRole) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
  }

  // Apply transition
  task.status = status

  if (status === 'APROVADO') {
    task.completedAt = new Date().toISOString()
    // Score: on time if now <= deadline + deadlineTime
    const deadlineStr = `${task.deadline}T${task.deadlineTime}:00`
    const onTime = new Date() <= new Date(deadlineStr)
    applyTaskScoreEvent(db, task, onTime)
  }

  if (status === 'REPROVADO') {
    if (!rejectionComment) {
      return NextResponse.json({ error: 'Comentário de reprovação é obrigatório' }, { status: 400 })
    }
    if (!rejectionNewDeadline) {
      return NextResponse.json({ error: 'Novo prazo é obrigatório ao reprovar' }, { status: 400 })
    }
    task.rejectionComment = rejectionComment
    task.rejectionNewDeadline = rejectionNewDeadline
    // Auto-advance back to EM_PRODUCAO
    task.status = 'EM_PRODUCAO'
    task.deadline = rejectionNewDeadline
  }

  writeDB(db)
  return NextResponse.json(task)
}
