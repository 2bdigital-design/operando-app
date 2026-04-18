import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB, addLog } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const db = readDB()
  const project = db.projects.find(p => p.id === id)
  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  if (project.assignedToId !== session.userId) {
    return NextResponse.json({ error: 'Só o responsável pode confirmar' }, { status: 403 })
  }

  const now = new Date().toISOString()
  project.confirmedAt = now
  project.startedAt = now
  project.status = 'EM_PRODUCAO'

  addLog(db, id, session.userId, 'CONFIRMADO', 'Responsabilidade confirmada — Em Produção')
  writeDB(db)
  return NextResponse.json(project)
}
