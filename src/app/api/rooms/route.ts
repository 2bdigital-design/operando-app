import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB, generateId } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const db = readDB()
  let rooms = db.rooms

  // Collaborators see only their rooms
  if (session.role === 'COLABORADOR') {
    rooms = rooms.filter(r => r.memberIds.includes(session.userId))
  }

  const enriched = rooms.map(r => ({
    ...r,
    memberCount: r.memberIds.length,
    members: r.memberIds.map(id => {
      const u = db.users.find(u => u.id === id)
      return u ? { id: u.id, name: u.name, avatar: u.avatar } : null
    }).filter(Boolean),
    projectCount: db.projects.filter(p => p.roomId === r.id).length,
    activeCount: db.projects.filter(p => p.roomId === r.id && ['EM_PRODUCAO','CONFIRMADO','DELEGADO'].includes(p.status)).length,
    overdueCount: db.projects.filter(p => p.roomId === r.id && p.status === 'ATRASADO').length,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Apenas gestores podem criar salas' }, { status: 403 })
  }

  const body = await req.json()
  const db = readDB()

  const room = {
    id: generateId('room'),
    name: body.name,
    description: body.description || '',
    color: body.color || '#2563eb',
    contactName: body.contactName || '',
    contactFunction: body.contactFunction || '',
    contactPhone: body.contactPhone || '',
    createdById: session.userId,
    memberIds: body.memberIds || [],
    createdAt: new Date().toISOString(),
  }

  db.rooms.push(room)
  writeDB(db)
  return NextResponse.json(room, { status: 201 })
}
