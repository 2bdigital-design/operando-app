import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB, generateId } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const db = readDB()
  let clients = db.clients

  // Collaborators see only their clients (via projects or memberIds)
  if (session.role === 'COLABORADOR') {
    const myProjectClientIds = db.projects
      .filter(p => p.assignedToIds?.includes(session.userId) || p.assignedToId === session.userId)
      .map(p => p.clientId)
      .filter(Boolean) as string[]
    clients = clients.filter(c =>
      c.memberIds.includes(session.userId) || myProjectClientIds.includes(c.id)
    )
  }

  const enriched = clients.map(c => {
    const clientProjects = db.projects.filter(p => p.clientId === c.id || p.roomId === c.id)
    const activeProjStatuses = ['DELEGADO', 'CONFIRMADO', 'EM_PRODUCAO', 'EM_REVISAO']
    return {
      ...c,
      projectCount: clientProjects.length,
      activeProjects: clientProjects.filter(p => activeProjStatuses.includes(p.status)).length,
      taskCount: db.tasks.filter(t => clientProjects.some(p => p.id === t.projectId)).length,
    }
  })

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Apenas gestores podem criar clientes' }, { status: 403 })
  }

  const body = await req.json()

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }
  if (!body.contactName?.trim()) {
    return NextResponse.json({ error: 'Nome do contacto é obrigatório' }, { status: 400 })
  }
  if (!body.contactFunction?.trim()) {
    return NextResponse.json({ error: 'Função do contacto é obrigatória' }, { status: 400 })
  }
  if (!body.contactPhone?.trim()) {
    return NextResponse.json({ error: 'Telefone do contacto é obrigatório' }, { status: 400 })
  }

  const db = readDB()

  const client = {
    id: generateId('client'),
    name: body.name.trim(),
    description: body.description?.trim() || '',
    color: body.color || '#2563eb',
    contactName: body.contactName.trim(),
    contactFunction: body.contactFunction.trim(),
    contactPhone: body.contactPhone.trim(),
    createdById: session.userId,
    memberIds: body.memberIds || [],
    createdAt: new Date().toISOString(),
  }

  db.clients.push(client)
  writeDB(db)
  return NextResponse.json(client, { status: 201 })
}
