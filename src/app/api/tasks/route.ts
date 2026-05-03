import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB, generateId, Task } from '@/lib/db'

function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  // Compare HH:MM strings
  return s1 < e2 && s2 < e1
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const assignedToId = searchParams.get('assignedToId')
  const status = searchParams.get('status')

  const db = readDB()
  let tasks = db.tasks

  if (projectId) tasks = tasks.filter(t => t.projectId === projectId)
  if (assignedToId) tasks = tasks.filter(t => t.assignedToId === assignedToId)
  if (status) tasks = tasks.filter(t => t.status === status)

  // Collaborators see only their own tasks
  if (session.role === 'COLABORADOR') {
    tasks = tasks.filter(t => t.assignedToId === session.userId)
  }

  const enriched = tasks.map(t => ({
    ...t,
    assignedToName: t.assignedToId ? db.users.find(u => u.id === t.assignedToId)?.name || '—' : null,
    assignedToAvatar: t.assignedToId ? db.users.find(u => u.id === t.assignedToId)?.avatar || '?' : null,
    projectName: db.projects.find(p => p.id === t.projectId)?.name || '—',
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'GESTOR' && session.role !== 'LIDER')) {
    return NextResponse.json({ error: 'Apenas gestores e líderes podem criar tarefas' }, { status: 403 })
  }

  const body = await req.json()

  if (!body.projectId) return NextResponse.json({ error: 'projectId é obrigatório' }, { status: 400 })
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  if (!body.deadline) return NextResponse.json({ error: 'Prazo é obrigatório' }, { status: 400 })
  if (!body.deadlineTime) return NextResponse.json({ error: 'Hora limite é obrigatória' }, { status: 400 })
  if (!body.startTime) return NextResponse.json({ error: 'Hora de início é obrigatória' }, { status: 400 })
  if (!body.endTime) return NextResponse.json({ error: 'Hora de fim é obrigatória' }, { status: 400 })

  const db = readDB()

  const project = db.projects.find(p => p.id === body.projectId)
  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  // Overlap check
  if (body.assignedToId) {
    const existing = db.tasks.filter(t =>
      t.assignedToId === body.assignedToId &&
      t.deadline === body.deadline &&
      t.id !== body.id
    )
    for (const t of existing) {
      if (timesOverlap(body.startTime, body.endTime, t.startTime, t.endTime)) {
        return NextResponse.json(
          { error: `Colaborador já tem tarefa neste horário: ${t.name} ${t.startTime}-${t.endTime}` },
          { status: 409 }
        )
      }
    }
  }

  const assignedUser = body.assignedToId
    ? db.users.find(u => u.id === body.assignedToId)
    : null

  const task: Task = {
    id: generateId('task'),
    projectId: body.projectId,
    name: body.name.trim(),
    description: body.description?.trim() || '',
    assignedToId: body.assignedToId || null,
    assignedToName: assignedUser?.name || null,
    status: 'PENDENTE',
    deadline: body.deadline,
    deadlineTime: body.deadlineTime,
    startTime: body.startTime,
    endTime: body.endTime,
    estimatedMinutes: body.estimatedMinutes || 0,
    resultLink: null,
    rejectionComment: null,
    rejectionNewDeadline: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    createdById: session.userId,
  }

  db.tasks.push(task)
  writeDB(db)
  return NextResponse.json(task, { status: 201 })
}
