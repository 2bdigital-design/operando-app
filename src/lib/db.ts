import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'db.json')

export type UserRole = 'GESTOR' | 'LIDER' | 'SUPERVISOR' | 'COLABORADOR'

export interface User {
  id: string
  name: string
  email: string
  password: string
  role: UserRole
  avatar: string
  createdAt: string
  // Scoring
  points: number
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
  // Scoring event flags
  scoredOnTime: boolean | null   // true = +100 applied, false = -50 applied, null = not scored yet
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

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  userAvatar: string
  userRole: UserRole
  content: string
  createdAt: string
}

export interface PointEvent {
  id: string
  userId: string
  projectId: string
  points: number
  reason: string
  createdAt: string
}

export interface DB {
  users: User[]
  rooms: Room[]
  projects: Project[]
  logs: Log[]
  comments: Comment[]
  messages: ChatMessage[]
  pointEvents: PointEvent[]
}

export function readDB(): DB {
  const raw = fs.readFileSync(DB_PATH, 'utf-8')
  const db = JSON.parse(raw)
  // Ensure new fields exist for backwards compat
  if (!db.rooms) db.rooms = []
  if (!db.messages) db.messages = []
  if (!db.pointEvents) db.pointEvents = []
  db.users = db.users.map((u: any) => ({
    points: 0,
    ...u,
  }))
  db.projects = db.projects.map((p: any) => ({
    attachments: [],
    roomId: null,
    scoredOnTime: null,
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
      // Deduct points from assigned collaborator for going overdue
      applyScoreEvent(db, p, false)
    }
  })
  return count
}

/**
 * Apply scoring to a project and its assigned user.
 * onTime = true  → +100 points
 * onTime = false → -50 points
 * Only applies once per project (scoredOnTime guard).
 */
export function applyScoreEvent(db: DB, project: Project, onTime: boolean) {
  if (project.scoredOnTime !== null) return // already scored
  if (!project.assignedToId) return

  const delta = onTime ? 100 : -50
  project.scoredOnTime = onTime

  const user = db.users.find(u => u.id === project.assignedToId)
  if (user) {
    user.points = (user.points || 0) + delta
    if (user.points < 0) user.points = 0
  }

  db.pointEvents.push({
    id: generateId('pe'),
    userId: project.assignedToId,
    projectId: project.id,
    points: delta,
    reason: onTime ? 'Concluído a tempo (+100)' : 'Projecto atrasado (-50)',
    createdAt: new Date().toISOString(),
  })
}
