import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB, generateId, addLog, checkAndMarkOverdue } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const db = readDB()
  checkAndMarkOverdue(db)
  writeDB(db)

  let projects = db.projects
  if (session.role === 'COLABORADOR') {
    projects = projects.filter(p => p.assignedToId === session.userId)
  }

  const enriched = projects.map(p => ({
    ...p,
    createdByName: db.users.find(u => u.id === p.createdById)?.name || '—',
    assignedToName: p.assignedToId ? db.users.find(u => u.id === p.assignedToId)?.name || '—' : null,
    assignedToAvatar: p.assignedToId ? db.users.find(u => u.id === p.assignedToId)?.avatar || '?' : null,
    delegatedByName: p.delegatedById ? db.users.find(u => u.id === p.delegatedById)?.name || '—' : null,
    roomName: p.roomId ? db.rooms.find(r => r.id === p.roomId)?.name || null : null,
    roomColor: p.roomId ? db.rooms.find(r => r.id === p.roomId)?.color || null : null,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Apenas gestores podem criar projetos' }, { status: 403 })
  }

  const body = await req.json()
  const db = readDB()

  const project = {
    id: generateId('proj'),
    name: body.name,
    client: body.client,
    objective: body.objective,
    deadline: body.deadline,
    priority: body.priority || 'MEDIA',
    status: 'DISPONIVEL' as const,
    progress: 0,
    roomId: body.roomId || null,
    attachments: (body.attachments || []).map((a: any) => ({
      id: generateId('att'),
      label: a.label || a.url,
      url: a.url,
      addedById: session.userId,
      addedAt: new Date().toISOString(),
    })),
    createdById: session.userId,
    assignedToId: null,
    delegatedById: null,
    createdAt: new Date().toISOString(),
    delegatedAt: null,
    confirmedAt: null,
    startedAt: null,
    completedAt: null,
  }

  db.projects.push(project)
  addLog(db, project.id, session.userId, 'CRIADO', 'Projeto criado')
  writeDB(db)

  return NextResponse.json(project, { status: 201 })
}
