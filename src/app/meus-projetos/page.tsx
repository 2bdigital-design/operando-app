'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { formatDate, daysUntil } from '@/lib/utils'

interface PointEvent {
  id: string
  projectId: string
  projectName: string
  points: number
  reason: string
  createdAt: string
}

interface PerfStats {
  totalPoints: number
  monthlyPoints: number
  total: number
  concluidos: number
  atrasados: number
  onTime: number
  late: number
  taxa: number
  events: PointEvent[]
}

function PointsLevel({ points }: { points: number }) {
  const levels = [
    { min: 1000, label: 'Elite', color: '#fcd34d', emoji: '👑' },
    { min: 500,  label: 'Expert', color: '#a855f7', emoji: '⭐' },
    { min: 200,  label: 'Avançado', color: '#3b82f6', emoji: '🔷' },
    { min: 50,   label: 'Iniciante', color: '#22c55e', emoji: '🌱' },
    { min: 0,    label: 'Novo', color: '#94a3b8', emoji: '🔰' },
  ]
  const level = levels.find(l => points >= l.min) || levels[levels.length - 1]
  const nextLevel = levels[levels.indexOf(level) - 1]
  const progress = nextLevel ? Math.min(100, ((points - level.min) / (nextLevel.min - level.min)) * 100) : 100

  return (
    <div style={{ padding: '16px 20px', background: 'rgba(6,12,26,0.5)', borderRadius: 12, border: '1px solid var(--glass-border)', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 32 }}>{level.emoji}</div>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Nível Atual</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: level.color }}>{level.label}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fcd34d' }}>{points}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>pontos totais</div>
        </div>
      </div>
      {nextLevel && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>
            <span>Próximo nível: {nextLevel.label} {nextLevel.emoji}</span>
            <span>{nextLevel.min - points} pontos para subir</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${level.color}, ${nextLevel.color})` }} />
          </div>
        </>
      )}
    </div>
  )
}

export default function MeusProjetosPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'projetos' | 'desempenho'>('projetos')
  const [perf, setPerf] = useState<PerfStats | null>(null)
  const [perfMonth, setPerfMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.error) { router.push('/'); return }
      setSession(d)
      loadPerf(d.userId, perfMonth)
    })
    loadProjects()
  }, [])

  useEffect(() => {
    if (session?.userId) loadPerf(session.userId, perfMonth)
  }, [perfMonth])

  async function loadProjects() {
    const res = await fetch('/api/projects')
    if (res.status === 401) { router.push('/'); return }
    setProjects(await res.json())
    setLoading(false)
  }

  async function loadPerf(uid: string, month: string) {
    const res = await fetch(`/api/performance?userId=${uid}&month=${month}`)
    if (res.ok) setPerf(await res.json())
  }

  async function confirm(id: string) {
    setConfirming(id)
    await fetch(`/api/projects/${id}/confirm`, { method: 'POST' })
    setConfirming(null)
    loadProjects()
  }

  const pendentes = projects.filter(p => p.status === 'DELEGADO')
  const ativos = projects.filter(p => ['CONFIRMADO','EM_PRODUCAO','EM_REVISAO'].includes(p.status))
  const atrasados = projects.filter(p => p.status === 'ATRASADO')
  const concluidos = projects.filter(p => ['CONCLUIDO','APROVADO'].includes(p.status))

  return (
    <div style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0 }}>
          Olá, {session?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 0' }}>
          {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Para Confirmar', value: pendentes.length, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
          { label: 'Em Execução',    value: ativos.length,    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
          { label: 'Atrasados',      value: atrasados.length, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
          { label: 'Concluídos',     value: concluidos.length,color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
        ].map(s => (
          <div key={s.label} className="kpi-card" style={{ flexDirection: 'column', gap: 4, padding: 14, alignItems: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--glass-border)', paddingBottom: 0 }}>
        {[
          { id: 'projetos', label: 'Meus Projetos' },
          { id: 'desempenho', label: '⭐ Desempenho & Pontuação' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 16px', fontSize: 14, fontWeight: 600,
              color: activeTab === tab.id ? '#60a5fa' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.18s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'projetos' ? (
        /* ─── PROJETOS TAB ─── */
        <div>
          {/* Pendentes */}
          {pendentes.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b80' }} />
                Aguardam a tua confirmação ({pendentes.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendentes.map(p => (
                  <div key={p.id} className="card" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: 'white', fontSize: 15, marginBottom: 4, wordBreak: 'break-word' }}>{p.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.client} · Prazo: {formatDate(p.deadline)}</div>
                        <div style={{ fontSize: 12, color: '#fcd34d', marginTop: 4 }}>Delegado por {p.delegatedByName || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <PriorityBadge priority={p.priority} />
                        <button
                          onClick={() => confirm(p.id)}
                          disabled={confirming === p.id}
                          className="btn-primary"
                          style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', whiteSpace: 'nowrap', fontSize: 13 }}
                        >
                          {confirming === p.id ? '…' : '✓ Confirmar'}
                        </button>
                        <button onClick={() => router.push(`/projetos/${p.id}`)} className="btn-secondary" style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                          Ver detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Atrasados */}
          {atrasados.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef444480' }} />
                Projetos Atrasados ({atrasados.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {atrasados.map(p => {
                  const days = Math.abs(daysUntil(p.deadline))
                  return (
                    <div key={p.id} className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', cursor: 'pointer' }} onClick={() => router.push(`/projetos/${p.id}`)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'white', fontSize: 14, wordBreak: 'break-word' }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.client}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 700 }}>{days}d atrasado</span>
                          <StatusBadge status={p.status} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Em execução */}
          {ativos.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#60a5fa', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 6px #3b82f680' }} />
                Em Execução ({ativos.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ativos.map(p => {
                  const days = daysUntil(p.deadline)
                  return (
                    <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => router.push(`/projetos/${p.id}`)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'white', fontSize: 14, wordBreak: 'break-word' }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.client}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <PriorityBadge priority={p.priority} />
                          <StatusBadge status={p.status} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.progress}%</span>
                        <span style={{
                          fontSize: 12, whiteSpace: 'nowrap', fontWeight: days <= 3 ? 700 : 400,
                          color: days < 0 ? '#ef4444' : days <= 3 ? '#f59e0b' : 'var(--text-muted)',
                        }}>
                          {days < 0 ? `${Math.abs(days)}d atrasado` : `${days}d restantes`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Concluídos */}
          {concluidos.length > 0 && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#22c55e', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e80' }} />
                Concluídos ({concluidos.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {concluidos.map(p => (
                  <div key={p.id} className="card" style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => router.push(`/projetos/${p.id}`)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'white', fontSize: 14, wordBreak: 'break-word' }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.client}</div>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && projects.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p style={{ color: 'white', fontSize: 16, fontWeight: 500, margin: '0 0 6px' }}>Nenhum projeto atribuído ainda</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>O gestor irá delegar projetos em breve</p>
            </div>
          )}
        </div>
      ) : (
        /* ─── DESEMPENHO TAB ─── */
        <div>
          {/* Month picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Mês:</label>
            <input
              type="month"
              value={perfMonth}
              onChange={e => {
                setPerfMonth(e.target.value)
              }}
              className="input"
              style={{ width: 'auto', padding: '8px 12px' }}
            />
            <button onClick={() => window.print()} className="btn-secondary" style={{ marginLeft: 'auto' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
              Exportar PDF
            </button>
          </div>

          {perf && (
            <>
              {/* Level & points */}
              <PointsLevel points={perf.totalPoints} />

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Pontos no Mês', value: `${perf.monthlyPoints >= 0 ? '+' : ''}${perf.monthlyPoints}`, color: perf.monthlyPoints >= 0 ? '#22c55e' : '#ef4444' },
                  { label: 'Total Projetos', value: perf.total, color: 'var(--text)' },
                  { label: 'Concluídos', value: perf.concluidos, color: '#22c55e' },
                  { label: 'A Tempo', value: perf.onTime, color: '#3b82f6' },
                  { label: 'Atrasados', value: perf.atrasados, color: '#ef4444' },
                  { label: 'Taxa', value: `${perf.taxa}%`, color: perf.taxa >= 80 ? '#22c55e' : perf.taxa >= 50 ? '#f59e0b' : '#ef4444' },
                ].map(s => (
                  <div key={s.label} className="kpi-card" style={{ flexDirection: 'column', gap: 4, padding: 14, alignItems: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* How scoring works */}
              <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(59,130,246,0.3)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: '0 0 12px' }}>ℹ Como funciona a pontuação</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#22c55e', minWidth: 60 }}>+100 pts</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Projecto concluído a tempo e sem atrasos</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#ef4444', minWidth: 60 }}>-50 pts</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Projecto que entrou em atraso (mínimo 0 pontos)</span>
                  </div>
                </div>
              </div>

              {/* Events history */}
              {perf.events.length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0 }}>Historial de Pontos</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {perf.events.map(e => (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                          background: e.points > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          border: `1px solid ${e.points > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16,
                        }}>
                          {e.points > 0 ? '✅' : '⏰'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'white', wordBreak: 'break-word' }}>{e.projectName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.reason}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: e.points > 0 ? '#22c55e' : '#ef4444' }}>
                            {e.points > 0 ? '+' : ''}{e.points}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                            {new Date(e.createdAt).toLocaleDateString('pt-PT')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {perf.events.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Nenhum evento de pontuação neste mês. Conclua projetos a tempo para ganhar pontos!</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
