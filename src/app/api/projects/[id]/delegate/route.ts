import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB, addLog } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Apenas gestores podem delegar' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  // Support both single (legacy) and multiple assignees
  const assignedToIds: string[] = body.assignedToIds
    ? body.assignedToIds
    : body.assignedToId
      ? [body.assignedToId]
      : []

  if (assignedToIds.length === 0) {
    return NextResponse.json({ error: 'Selecione pelo menos um colaborador' }, { status: 400 })
  }

  const db = readDB()
  const project = db.projects.find(p => p.id === id)
  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  const users = db.users.filter(u => assignedToIds.includes(u.id))
  if (users.length !== assignedToIds.length) {
    return NextResponse.json({ error: 'Um ou mais colaboradores não encontrados' }, { status: 404 })
  }

  project.assignedToIds = assignedToIds
  project.assignedToNames = users.map(u => u.name)
  // Keep legacy single fields pointing to first assignee
  project.assignedToId = assignedToIds[0]
  project.assignedToName = users[0].name
  project.delegatedById = session.userId
  project.delegatedAt = new Date().toISOString()
  project.status = 'DELEGADO'

  addLog(db, id, session.userId, 'DELEGADO', `Delegado para: ${users.map(u => u.name).join(', ')}`)
  writeDB(db)
  return NextResponse.json(project)
}
