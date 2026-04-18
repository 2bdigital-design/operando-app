import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB, generateId } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const { text } = await req.json()

  const db = readDB()
  if (!db.projects.find(p => p.id === id)) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  const comment = {
    id: generateId('cmt'),
    projectId: id,
    authorId: session.userId,
    text,
    createdAt: new Date().toISOString(),
  }
  db.comments.push(comment)
  writeDB(db)

  return NextResponse.json({ ...comment, authorName: session.name, authorAvatar: session.avatar }, { status: 201 })
}
