import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB, checkAndMarkOverdue } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const db = readDB()
  checkAndMarkOverdue(db)
  writeDB(db)

  const client = db.clients.find(c => c.id === id)
  if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  const members = client.memberIds.map(uid => {
    const u = db.users.find(u => u.id === uid)
    return u ? { id: u.id, name: u.name, avatar: u.avatar, email: u.email } : null
  }).filter(Boolean)

  const projects = db.projects
    .filter(p => p.clientId === id || p.roomId === id)
    .map(p => ({
      ...p,
      assignedToName: p.assignedToId ? db.users.find(u => u.id === p.assignedToId)?.name || '—' : null,
      assignedToAvatar: p.assignedToId ? db.users.find(u => u.id === p.assignedToId)?.avatar || '?' : null,
      tasks: db.tasks.filter(t => t.projectId === p.id),
    }))

  return NextResponse.json({ ...client, members, projects })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.role !== 'GESTOR' && session.role !== 'LIDER')) {
    return NextResponse.json({ error: 'Sem permissão para editar clientes' }, { status: 403 })
  }

  const { id } = await params
  const db = readDB()
  const client = db.clients.find(c => c.id === id)
  if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  const body = await req.json()
  if (body.name !== undefined) client.name = body.name
  if (body.description !== undefined) client.description = body.description
  if (body.color !== undefined) client.color = body.color
  if (body.contactName !== undefined) client.contactName = body.contactName
  if (body.contactFunction !== undefined) client.contactFunction = body.contactFunction
  if (body.contactPhone !== undefined) client.contactPhone = body.contactPhone
  if (body.memberIds !== undefined) client.memberIds = body.memberIds

  writeDB(db)
  return NextResponse.json(client)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Apenas gestores podem eliminar clientes' }, { status: 403 })
  }

  const { id } = await params
  const db = readDB()
  const idx = db.clients.findIndex(c => c.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  db.clients.splice(idx, 1)
  // Unlink projects from this client
  db.projects.forEach(p => {
    if (p.clientId === id) { p.clientId = null; p.clientName = null }
    if (p.roomId === id) p.roomId = null
  })
  writeDB(db)
  return NextResponse.json({ ok: true })
}
