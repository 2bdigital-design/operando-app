import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB, generateId, ChatMessage } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const db = readDB()
  const { searchParams } = new URL(req.url)
  const since = searchParams.get('since')

  let messages = db.messages || []

  if (since) {
    messages = messages.filter(m => new Date(m.createdAt) > new Date(since))
  }

  // Return last 100 messages sorted oldest first
  const sorted = messages
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-100)

  return NextResponse.json(sorted)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
  }

  const db = readDB()
  if (!db.messages) db.messages = []

  const msg: ChatMessage = {
    id: generateId('msg'),
    userId: session.userId,
    userName: session.name,
    userAvatar: session.avatar,
    userRole: session.role,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  }

  db.messages.push(msg)

  // Keep only last 500 messages
  if (db.messages.length > 500) {
    db.messages = db.messages.slice(-500)
  }

  writeDB(db)
  return NextResponse.json(msg, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Apenas gestores podem apagar mensagens' }, { status: 403 })
  }

  const { messageId } = await req.json()
  const db = readDB()
  if (!db.messages) return NextResponse.json({ ok: true })

  db.messages = db.messages.filter(m => m.id !== messageId)
  writeDB(db)
  return NextResponse.json({ ok: true })
}
