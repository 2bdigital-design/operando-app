import { NextResponse } from 'next/server'
import { getSession, canSeeFullStats } from '@/lib/auth'
import { readDB, checkAndMarkOverdue, writeDB } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || !canSeeFullStats(session.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }
  const userCanCreate = session.role === 'GESTOR' || session.role === 'LIDER'

  const db = readDB()
  checkAndMarkOverdue(db)
  writeDB(db)

  const projects = db.projects
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const ativos = projects.filter(p => p.status === 'EM_PRODUCAO').length
  const atrasados = projects.filter(p => p.status === 'ATRASADO').length
  const concluidosHoje = projects.filter(p => {
    if (p.status !== 'CONCLUIDO' || !p.completedAt) return false
    const d = new Date(p.completedAt); d.setHours(0,0,0,0)
    return d.getTime() === today.getTime()
  }).length
  const naoConfirmados = projects.filter(p => p.status === 'DELEGADO').length
  const disponiveis = projects.filter(p => p.status === 'DISPONIVEL').length
  const total = projects.length

  // Workload per colaborador
  const workload = db.users
    .filter(u => u.role === 'COLABORADOR')
    .map(u => {
      const mine = projects.filter(p => p.assignedToId === u.id && !['CONCLUIDO', 'APROVADO'].includes(p.status))
      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        count: mine.length,
        atrasados: mine.filter(p => p.status === 'ATRASADO').length,
        points: u.points || 0,
      }
    })

  // Recent projects (last 10)
  const recent = projects
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map(p => ({
      ...p,
      assignedToName: p.assignedToId ? db.users.find(u => u.id === p.assignedToId)?.name || '—' : null,
      assignedToAvatar: p.assignedToId ? db.users.find(u => u.id === p.assignedToId)?.avatar || '?' : null,
    }))

  return NextResponse.json({ ativos, atrasados, concluidosHoje, naoConfirmados, disponiveis, total, workload, recent, canCreate: userCanCreate })
}
