import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readDB, writeDB, generateId } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const db = readDB()
  const project = db.projects.find(p => p.id === id)
  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  const { label, url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL obrigatório' }, { status: 400 })

  const attachment = {
    id: generateId('att'),
    label: label || url,
    url,
    addedById: session.userId,
    addedAt: new Date().toISOString(),
  }

  if (!project.attachments) project.attachments = []
  project.attachments.push(attachment)
  writeDB(db)

  return NextResponse.json(attachment, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const { attachmentId } = await req.json()

  const db = readDB()
  const project = db.projects.find(p => p.id === id)
  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  project.attachments = (project.attachments || []).filter(a => a.id !== attachmentId)
  writeDB(db)
  return NextResponse.json({ ok: true })
}
