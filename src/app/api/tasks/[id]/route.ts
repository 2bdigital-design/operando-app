import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const db = readDB()
  const task = db.tasks.find(t => t.id === id)
  if (!task) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  // Collaborators can only see their own tasks
  if (session.role === 'COLABORADOR' && task.assignedToId !== session.userId) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  return NextResponse.json({
    ...task,
    assignedToAvatar: task.assignedToId ? db.users.find(u => u.id === task.assignedToId)?.avatar || '?' : null,
    projectName: db.projects.find(p => p.id === task.projectId)?.name || '—',
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const db = readDB()
  const task = db.tasks.find(t => t.id === id)
  if (!task) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  const isManagerRole = session.role === 'GESTOR' || session.role === 'LIDER'
  const isAssigned = task.assignedToId === session.userId

  // Collaborators can only update resultLink
  if (!isManagerRole && !isAssigned) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()

  if (isManagerRole) {
    if (body.name !== undefined) task.name = body.name
    if (body.description !== undefined) task.description = body.description
    if (body.assignedToId !== undefined) {
      task.assignedToId = body.assignedToId
      task.assignedToName = body.assignedToId
        ? db.users.find(u => u.id === body.assignedToId)?.name || null
        : null
    }
    if (body.deadline !== undefined) task.deadline = body.deadline
    if (body.deadlineTime !== undefined) task.deadlineTime = body.deadlineTime
    if (body.startTime !== undefined) task.startTime = body.startTime
    if (body.endTime !== undefined) task.endTime = body.endTime
    if (body.estimatedMinutes !== undefined) task.estimatedMinutes = body.estimatedMinutes
  }

  // Anyone assigned can update resultLink
  if (body.resultLink !== undefined) task.resultLink = body.resultLink

  writeDB(db)
  return NextResponse.json(task)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.role !== 'GESTOR' && session.role !== 'LIDER')) {
    return NextResponse.json({ error: 'Sem permissão para eliminar tarefas' }, { status: 403 })
  }

  const { id } = await params
  const db = readDB()
  const idx = db.tasks.findIndex(t => t.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  db.tasks.splice(idx, 1)
  writeDB(db)
  return NextResponse.json({ ok: true })
}
