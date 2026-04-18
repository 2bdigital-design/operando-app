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

  const room = db.rooms.find(r => r.id === id)
  if (!room) return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })

  const members = room.memberIds.map(uid => {
    const u = db.users.find(u => u.id === uid)
    return u ? { id: u.id, name: u.name, avatar: u.avatar, email: u.email } : null
  }).filter(Boolean)

  const projects = db.projects
    .filter(p => p.roomId === id)
    .map(p => ({
      ...p,
      assignedToName: p.assignedToId ? db.users.find(u => u.id === p.assignedToId)?.name || '—' : null,
      assignedToAvatar: p.assignedToId ? db.users.find(u => u.id === p.assignedToId)?.avatar || '?' : null,
    }))

  return NextResponse.json({ ...room, members, projects })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Apenas gestores podem editar salas' }, { status: 403 })
  }

  const { id } = await params
  const db = readDB()
  const room = db.rooms.find(r => r.id === id)
  if (!room) return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })

  const body = await req.json()
  if (body.name !== undefined) room.name = body.name
  if (body.description !== undefined) room.description = body.description
  if (body.color !== undefined) room.color = body.color
  if (body.memberIds !== undefined) room.memberIds = body.memberIds

  writeDB(db)
  return NextResponse.json(room)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Apenas gestores podem eliminar salas' }, { status: 403 })
  }

  const { id } = await params
  const db = readDB()
  const idx = db.rooms.findIndex(r => r.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })

  db.rooms.splice(idx, 1)
  // Unlink projects from this room
  db.projects.forEach(p => { if (p.roomId === id) p.roomId = null })
  writeDB(db)
  return NextResponse.json({ ok: true })
}
