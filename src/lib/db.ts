import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'db.json')

export interface User {
  id: string
  name: string
  email: string
  password: string
  role: 'GESTOR' | 'COLABORADOR'
  avatar: string
  createdAt: string
}

export interface Attachment {
  id: string
  label: string
  url: string
  addedById: string
  addedAt: string
}

export interface Project {
  id: string
  name: string
  client: string
  objective: string
  deadline: string
  priority: 'ALTA' | 'MEDIA' | 'BAIXA'
  status: ProjectStatus
  progress: number
  roomId: string | null
  attachments: Attachment[]
  createdById: string
  assignedToId: string | null
  delegatedById: string | null
  createdAt: string
  delegatedAt: string | null
  confirmedAt: string | null
  startedAt: string | null
  completedAt: string | null
}

export type ProjectStatus =
  | 'DISPONIVEL'
  | 'DELEGADO'
  | 'CONFIRMADO'
  | 'EM_PRODUCAO'
  | 'EM_REVISAO'
  | 'APROVADO'
  | 'CONCLUIDO'
  | 'ATRASADO'

export interface Room {
  id: string
  name: string
  description: string
  color: string
  createdById: string
  memberIds: string[]
  createdAt: string
}

export interface Log {
  id: string
  projectId: string
  userId: string
  action: string
  detail: string | null
  createdAt: string
}

export interface Comment {
  id: string
  projectId: string
  authorId: string
  text: string
  createdAt: string
}

export interface DB {
  users: User[]
  rooms: Room[]
  projects: Project[]
  logs: Log[]
  comments: Comment[]
}

export function readDB(): DB {
  const raw = fs.readFileSync(DB_PATH, 'utf-8')
  const db = JSON.parse(raw)
  // Ensure new fields exist for backwards compat
  if (!db.rooms) db.rooms = []
  db.projects = db.projects.map((p: any) => ({
    attachments: [],
    roomId: null,
    ...p,
  }))
  return db
}

export function writeDB(db: DB): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function addLog(db: DB, projectId: string, userId: string, action: string, detail?: string) {
  db.logs.push({
    id: generateId('log'),
    projectId,
    userId,
    action,
    detail: detail || null,
    createdAt: new Date().toISOString(),
  })
}

export function checkAndMarkOverdue(db: DB): number {
  const now = new Date()
  let count = 0
  db.projects.forEach(p => {
    if (
      !['CONCLUIDO', 'APROVADO', 'ATRASADO'].includes(p.status) &&
      new Date(p.deadline) < now
    ) {
      p.status = 'ATRASADO'
      count++
    }
  })
  return count
}
