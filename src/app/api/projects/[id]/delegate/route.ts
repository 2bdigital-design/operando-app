import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB, addLog } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Apenas gestores podem delegar' }, { status: 403 })
  }

  const { id } = await params
  const { assignedToId } = await req.json()

  const db = readDB()
  const project = db.projects.find(p => p.id === id)
  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  const user = db.users.find(u => u.id === assignedToId)
  if (!user) return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 })

  project.assignedToId = assignedToId
  project.assignedToName = user.name
  project.assignedToIds = [assignedToId]
  project.assignedToNames = [user.name]
  project.delegatedById = session.userId
  project.delegatedAt = new Date().toISOString()
  project.status = 'DELEGADO'

  addLog(db, id, session.userId, 'DELEGADO', `Delegado para ${user.name}`)
  writeDB(db)
  return NextResponse.json(project)
}
