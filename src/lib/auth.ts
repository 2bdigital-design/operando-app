import { cookies } from 'next/headers'
import { readDB, User } from './db'

const SESSION_COOKIE = 'gestao_session'

export interface Session {
  userId: string
  role: 'GESTOR' | 'COLABORADOR'
  name: string
  email: string
  avatar: string
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value
  if (!raw) return null
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as Session
  } catch {
    return null
  }
}

export function encodeSession(user: User): string {
  const session: Session = {
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  }
  return Buffer.from(JSON.stringify(session)).toString('base64')
}

export async function requireSession(): Promise<Session> {
  const s = await getSession()
  if (!s) throw new Error('Não autenticado')
  return s
}

export async function requireGestor(): Promise<Session> {
  const s = await requireSession()
  if (s.role !== 'GESTOR') throw new Error('Acesso negado')
  return s
}

export function login(email: string, password: string): User | null {
  const db = readDB()
  return db.users.find(u => u.email === email && u.password === password) || null
}
