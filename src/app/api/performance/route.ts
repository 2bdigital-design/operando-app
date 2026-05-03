import { NextRequest, NextResponse } from 'next/server'
import { getSession, canSeeFullStats } from '@/lib/auth'
import { readDB, checkAndMarkOverdue, writeDB } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const db = readDB()
  checkAndMarkOverdue(db)
  writeDB(db)

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') // filter for single user (colaborador viewing own data)
  const month = searchParams.get('month')   // YYYY-MM

  // If not manager-level, can only see own data
  const targetUserId = canSeeFullStats(session.role) ? userId : session.userId

  const collaborators = db.users.filter(u => u.role === 'COLABORADOR')

  const buildStats = (uid: string) => {
    const user = db.users.find(u => u.id === uid)
    if (!user) return null

    let projects = db.projects.filter(p => p.assignedToId === uid)

    // Filter by month if provided
    if (month) {
      const [yr, mo] = month.split('-').map(Number)
      projects = projects.filter(p => {
        const d = new Date(p.createdAt)
        return d.getFullYear() === yr && d.getMonth() + 1 === mo
      })
    }

    const total = projects.length
    const concluidos = projects.filter(p => ['CONCLUIDO', 'APROVADO'].includes(p.status)).length
    const atrasados = projects.filter(p => p.status === 'ATRASADO').length
    const emProducao = projects.filter(p => ['EM_PRODUCAO', 'CONFIRMADO', 'EM_REVISAO'].includes(p.status)).length
    const onTime = projects.filter(p => p.scoredOnTime === true).length
    const late = projects.filter(p => p.scoredOnTime === false).length
    const taxa = total > 0 ? Math.round((concluidos / total) * 100) : 0

    // Point events for this user
    const events = db.pointEvents
      .filter(e => e.userId === uid)
      .filter(e => {
        if (!month) return true
        const [yr, mo] = month.split('-').map(Number)
        const d = new Date(e.createdAt)
        return d.getFullYear() === yr && d.getMonth() + 1 === mo
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const monthlyPoints = events.reduce((sum, e) => sum + e.points, 0)

    return {
      userId: uid,
      name: user.name,
      avatar: user.avatar,
      email: user.email,
      totalPoints: user.points || 0,
      monthlyPoints,
      total,
      concluidos,
      atrasados,
      emProducao,
      onTime,
      late,
      taxa,
      events: events.map(e => ({
        ...e,
        projectName: db.projects.find(p => p.id === e.projectId)?.name || '—',
      })),
    }
  }

  if (targetUserId) {
    const stats = buildStats(targetUserId)
    if (!stats) return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 })
    return NextResponse.json(stats)
  }

  // Return stats for all collaborators
  const all = collaborators.map(u => buildStats(u.id)).filter(Boolean)
  return NextResponse.json(all)
}
