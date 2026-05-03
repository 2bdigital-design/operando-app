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

export interface Client {
  id: string
  name: string
  description: string
  color: string
  contactName: string
  contactFunction: string
  contactPhone: string
  createdById: string
  memberIds: string[]
  createdAt: string
}

// Keep Room as alias for backward compat
export type Room = Client

export interface Project {
  id: string
  name: string
  client: string          // free-text client name (legacy)
  clientId: string | null // pointer to Client.id
  clientName: string | null
  objective: string
  deadline: string
  priority: 'ALTA' | 'MEDIA' | 'BAIXA'
  status: ProjectStatus
  progress: number
  roomId: string | null   // backward compat alias for clientId
  attachments: Attachment[]
  createdById: string
  assignedToId: string | null       // first assignee (backward compat)
  assignedToName: string | null
  assignedToIds: string[]           // multiple assignees
  assignedToNames: string[]
  delegatedById: string | null
  createdAt: string
  delegatedAt: string | null
  confirmedAt: string | null
  startedAt: string | null
  completedAt: string | null
  // Scoring event flags
  scoredOnTime: boolean | null
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

export type TaskStatus = 'PENDENTE' | 'EM_PRODUCAO' | 'EM_REVISAO' | 'APROVADO' | 'REPROVADO'

export interface Task {
  id: string
  projectId: string
  name: string
  description: string
  assignedToId: string | null
  assignedToName: string | null
  status: TaskStatus
  deadline: string           // YYYY-MM-DD
  deadlineTime: string       // HH:MM
  startTime: string          // HH:MM - scheduled start
  endTime: string            // HH:MM - scheduled end
  estimatedMinutes: number
  resultLink: string | null
  rejectionComment: string | null
  rejectionNewDeadline: string | null
  createdAt: string
  completedAt: string | null
  createdById: string
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
  rooms: Client[]     // backward compat — same array as clients
  clients: Client[]   // canonical name
  projects: Project[]
  tasks: Task[]
  logs: Log[]
  comments: Comment[]
  messages: ChatMessage[]
  pointEvents: PointEvent[]
}

export function readDB(): DB {
  const raw = fs.readFileSync(DB_PATH, 'utf-8')
  const db = JSON.parse(raw) as Record<string, unknown[]>

  // Backward compat initialisation
  if (!db.rooms) db.rooms = []
  if (!db.clients) {
    // alias clients = rooms (same reference after parse)
    db.clients = db.rooms
  }
  if (!db.tasks) db.tasks = []
  if (!db.messages) db.messages = []
  if (!db.pointEvents) db.pointEvents = []

  // Ensure clients have new contact fields
  ;(db.clients as Client[]).forEach((c: any) => {
    if (c.contactName === undefined) c.contactName = ''
    if (c.contactFunction === undefined) c.contactFunction = ''
    if (c.contactPhone === undefined) c.contactPhone = ''
    if (c.memberIds === undefined) c.memberIds = []
  })

  const result = db as unknown as DB

  result.users = result.users.map((u: any) => ({
    points: 0,
    ...u,
  }))

  result.projects = result.projects.map((p: any) => ({
    attachments: [],
    roomId: null,
    clientId: null,
    clientName: null,
    assignedToIds: [],
    assignedToNames: [],
    assignedToName: null,
    scoredOnTime: null,
    ...p,
    // sync clientId / roomId alias (applied after spread so no duplicate key)
  })).map((p: any) => ({
    ...p,
    clientId: p.clientId ?? p.roomId ?? null,
    roomId: p.clientId ?? p.roomId ?? null,
  }))

  // Keep rooms and clients pointing to same array
  result.rooms = result.clients

  return result
}

export function writeDB(db: DB): void {
  // Make sure clients and rooms are the same before writing
  const out = { ...db, rooms: db.clients }
  fs.writeFileSync(DB_PATH, JSON.stringify(out, null, 2), 'utf-8')
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
      applyScoreEvent(db, p, false)
    }
  })
  return count
}

/**
 * Apply scoring to a project and its assigned user.
 * onTime = true  → +100 points
 * onTime = false → -50 points
 */
export function applyScoreEvent(db: DB, project: Project, onTime: boolean) {
  if (project.scoredOnTime !== null) return
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

/**
 * Apply scoring for task completion.
 * onTime = true  → +20 points
 * onTime = false → -10 points
 */
export function applyTaskScoreEvent(db: DB, task: Task, onTime: boolean) {
  if (!task.assignedToId) return

  const delta = onTime ? 20 : -10

  const user = db.users.find(u => u.id === task.assignedToId)
  if (user) {
    user.points = Math.max(0, (user.points || 0) + delta)
  }

  db.pointEvents.push({
    id: generateId('pe'),
    userId: task.assignedToId,
    projectId: task.projectId,
    points: delta,
    reason: onTime ? `Tarefa concluída a tempo: ${task.name} (+20)` : `Tarefa concluída em atraso: ${task.name} (-10)`,
    createdAt: new Date().toISOString(),
  })
}
