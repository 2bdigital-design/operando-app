import { cookies } from 'next/headers'
import { readDB, User, UserRole } from './db'

const SESSION_COOKIE = 'gestao_session'

export interface Session {
  userId: string
  role: UserRole
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

export async function requireGestorOrLider(): Promise<Session> {
  const s = await requireSession()
  if (s.role !== 'GESTOR' && s.role !== 'LIDER') throw new Error('Acesso negado')
  return s
}

export async function requireGestorOrSupervisor(): Promise<Session> {
  const s = await requireSession()
  if (s.role !== 'GESTOR' && s.role !== 'SUPERVISOR') throw new Error('Acesso negado')
  return s
}

export async function requireGestorOrLiderOrSupervisor(): Promise<Session> {
  const s = await requireSession()
  if (!['GESTOR', 'LIDER', 'SUPERVISOR'].includes(s.role)) throw new Error('Acesso negado')
  return s
}

/** Returns true if the role has management-level access (can create projects) */
export function canCreateProjects(role: UserRole): boolean {
  return ['GESTOR', 'LIDER'].includes(role)
}

/** Returns true if the role can see full stats of all users */
export function canSeeFullStats(role: UserRole): boolean {
  return ['GESTOR', 'LIDER', 'SUPERVISOR'].includes(role)
}

/** Returns true if role can add/remove users */
export function canManageUsers(role: UserRole): boolean {
  return role === 'GESTOR'
}

export function login(email: string, password: string): User | null {
  const db = readDB()
  return db.users.find(u => u.email === email && u.password === password) || null
}
