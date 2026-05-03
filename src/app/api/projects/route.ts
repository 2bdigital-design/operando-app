import { NextRequest, NextResponse } from 'next/server'
import { getSession, canCreateProjects } from '@/lib/auth'
import { readDB, writeDB, generateId, addLog, checkAndMarkOverdue } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const db = readDB()
  checkAndMarkOverdue(db)
  writeDB(db)

  let projects = db.projects
  if (session.role === 'COLABORADOR') {
    projects = projects.filter(p =>
      p.assignedToId === session.userId ||
      (p.assignedToIds || []).includes(session.userId)
    )
  }

  const enriched = projects.map(p => ({
    ...p,
    createdByName: db.users.find(u => u.id === p.createdById)?.name || '—',
    assignedToName: p.assignedToId ? db.users.find(u => u.id === p.assignedToId)?.name || '—' : null,
    assignedToAvatar: p.assignedToId ? db.users.find(u => u.id === p.assignedToId)?.avatar || '?' : null,
    delegatedByName: p.delegatedById ? db.users.find(u => u.id === p.delegatedById)?.name || '—' : null,
    clientName: p.clientId ? db.clients.find(c => c.id === p.clientId)?.name || null : null,
    roomName: p.clientId ? db.clients.find(c => c.id === p.clientId)?.name || null : null,
    roomColor: p.clientId ? db.clients.find(c => c.id === p.clientId)?.color || null : null,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !canCreateProjects(session.role)) {
    return NextResponse.json({ error: 'Sem permissão para criar projetos' }, { status: 403 })
  }

  const body = await req.json()

  if (!body.clientId) {
    return NextResponse.json({ error: 'clientId é obrigatório' }, { status: 400 })
  }

  const db = readDB()

  const clientRecord = db.clients.find(c => c.id === body.clientId)
  if (!clientRecord) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  // Support multiple assignees
  const assignedToIds: string[] = Array.isArray(body.assignedToIds) ? body.assignedToIds : (body.assignedToId ? [body.assignedToId] : [])
  const assignedToNames: string[] = assignedToIds.map(uid => db.users.find(u => u.id === uid)?.name || '—')
  const firstAssigneeId = assignedToIds[0] || null
  const firstAssigneeName = assignedToNames[0] || null

  const project = {
    id: generateId('proj'),
    name: body.name,
    client: body.client || clientRecord.name,
    clientId: body.clientId,
    clientName: clientRecord.name,
    objective: body.objective,
    deadline: body.deadline,
    priority: body.priority || 'MEDIA',
    status: 'DISPONIVEL' as const,
    progress: 0,
    roomId: body.clientId,
    attachments: (body.attachments || []).map((a: any) => ({
      id: generateId('att'),
      label: a.label || a.url,
      url: a.url,
      addedById: session.userId,
      addedAt: new Date().toISOString(),
    })),
    createdById: session.userId,
    assignedToId: firstAssigneeId,
    assignedToName: firstAssigneeName,
    assignedToIds,
    assignedToNames,
    delegatedById: null,
    createdAt: new Date().toISOString(),
    delegatedAt: null,
    confirmedAt: null,
    startedAt: null,
    completedAt: null,
    scoredOnTime: null,
  }

  db.projects.push(project)
  addLog(db, project.id, session.userId, 'CRIADO', 'Projeto criado')
  writeDB(db)

  return NextResponse.json(project, { status: 201 })
}
