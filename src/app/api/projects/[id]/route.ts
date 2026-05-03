import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB, addLog } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const db = readDB()
  const project = db.projects.find(p => p.id === id)
  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  const logs = db.logs
    .filter(l => l.projectId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(l => ({ ...l, userName: db.users.find(u => u.id === l.userId)?.name || '—' }))

  const comments = db.comments
    .filter(c => c.projectId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(c => ({ ...c, authorName: db.users.find(u => u.id === c.authorId)?.name || '—', authorAvatar: db.users.find(u => u.id === c.authorId)?.avatar || '?' }))

  const clientRecord = project.clientId ? db.clients.find(c => c.id === project.clientId) : null

  return NextResponse.json({
    ...project,
    createdByName: db.users.find(u => u.id === project.createdById)?.name || '—',
    assignedToName: project.assignedToId ? db.users.find(u => u.id === project.assignedToId)?.name || '—' : null,
    assignedToAvatar: project.assignedToId ? db.users.find(u => u.id === project.assignedToId)?.avatar || '?' : null,
    delegatedByName: project.delegatedById ? db.users.find(u => u.id === project.delegatedById)?.name || '—' : null,
    clientName: clientRecord?.name || project.clientName || null,
    roomName: clientRecord?.name || null,
    roomColor: clientRecord?.color || null,
    logs,
    comments,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const db = readDB()
  const idx = db.projects.findIndex(p => p.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  const body = await req.json()
  const project = db.projects[idx]

  // Update allowed fields
  if (body.name !== undefined) project.name = body.name
  if (body.client !== undefined) project.client = body.client
  if (body.objective !== undefined) project.objective = body.objective
  if (body.deadline !== undefined) project.deadline = body.deadline
  if (body.priority !== undefined) project.priority = body.priority
  if (body.progress !== undefined) project.progress = Math.min(100, Math.max(0, body.progress))
  if (body.roomId !== undefined) project.roomId = body.roomId

  addLog(db, id, session.userId, 'EDITADO', 'Projeto atualizado')
  writeDB(db)
  return NextResponse.json(project)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Apenas gestores podem eliminar projetos' }, { status: 403 })
  }

  const { id } = await params
  const db = readDB()
  const idx = db.projects.findIndex(p => p.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  db.projects.splice(idx, 1)
  db.logs = db.logs.filter(l => l.projectId !== id)
  db.comments = db.comments.filter(c => c.projectId !== id)
  writeDB(db)
  return NextResponse.json({ ok: true })
}
