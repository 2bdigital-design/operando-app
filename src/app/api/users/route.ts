import { NextRequest, NextResponse } from 'next/server'
import { getSession, canManageUsers } from '@/lib/auth'
import { readDB, writeDB, generateId, UserRole } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const db = readDB()

  const users = db.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar,
    createdAt: u.createdAt,
    points: u.points || 0,
  }))

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Apenas gestores podem criar membros' }, { status: 403 })
  }

  const { name, email, password, role } = await req.json()

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Nome, email e password são obrigatórios' }, { status: 400 })
  }

  // GESTOR cannot be created via API; allowed: LIDER, SUPERVISOR, COLABORADOR
  const allowed: UserRole[] = ['LIDER', 'SUPERVISOR', 'COLABORADOR']
  const assignedRole: UserRole = allowed.includes(role) ? role : 'COLABORADOR'

  const db = readDB()

  if (db.users.find(u => u.email === email.trim().toLowerCase())) {
    return NextResponse.json({ error: 'Este email já está registado' }, { status: 409 })
  }

  const initials = name.trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  const user = {
    id: generateId('user'),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
    role: assignedRole,
    avatar: initials,
    createdAt: new Date().toISOString(),
    points: 0,
  }

  db.users.push(user)
  writeDB(db)

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    points: 0,
  }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Apenas gestores podem remover membros' }, { status: 403 })
  }

  const { userId } = await req.json()
  const db = readDB()

  const idx = db.users.findIndex(u => u.id === userId)
  if (idx === -1) return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 })

  const user = db.users[idx]
  if (user.role === 'GESTOR') {
    return NextResponse.json({ error: 'Não é possível remover gestores' }, { status: 403 })
  }

  db.users.splice(idx, 1)
  writeDB(db)
  return NextResponse.json({ ok: true })
}
