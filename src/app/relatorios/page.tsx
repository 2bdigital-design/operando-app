'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { formatDate, daysUntil } from '@/lib/utils'

type Period = 'hoje' | 'semana' | 'mes' | 'tudo'

function getPeriodLabel(p: Period) {
  return { hoje: 'Hoje', semana: 'Esta Semana', mes: 'Este Mês', tudo: 'Todos os Tempos' }[p]
}

function inPeriod(isoDate: string | null, period: Period): boolean {
  if (!isoDate) return false
  const d = new Date(isoDate)
  const now = new Date()
  if (period === 'hoje') {
    const s = new Date(now); s.setHours(0,0,0,0)
    const e = new Date(now); e.setHours(23,59,59,999)
    return d >= s && d <= e
  }
  if (period === 'semana') {
    const day = now.getDay()
    const s = new Date(now); s.setDate(now.getDate() - day); s.setHours(0,0,0,0)
    const e = new Date(now); e.setDate(now.getDate() + (6 - day)); e.setHours(23,59,59,999)
    return d >= s && d <= e
  }
  if (period === 'mes') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }
  return true // 'tudo'
}

export default function RelatoriosPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('tudo')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (!d.error) setSession(d) })
    fetch('/api/projects').then(r => {
      if (r.status === 401) { router.push('/'); return null }
      return r.json()
    }).then(d => { if (d) { setProjects(d); setLoading(false) } })
  }, [])

  // Filter by period (use createdAt for 'tudo', or completedAt for completed)
  function filterByPeriod(list: any[]) {
    if (period === 'tudo') return list
    return list.filter(p => inPeriod(p.createdAt, period) || inPeriod(p.completedAt, period))
  }

  const filtered = filterByPeriod(projects).filter(p => statusFilter === 'TODOS' || p.status === statusFilter)

  // Stats for filtered set
  const stats = {
    total: filtered.length,
    emProducao: filtered.filter(p => p.status === 'EM_PRODUCAO').length,
    atrasados: filtered.filter(p => p.status === 'ATRASADO').length,
    concluidos: filtered.filter(p => ['CONCLUIDO', 'APROVADO'].includes(p.status)).length,
    disponiveis: filtered.filter(p => p.status === 'DISPONIVEL').length,
    delegados: filtered.filter(p => p.status === 'DELEGADO').length,
    emRevisao: filtered.filter(p => p.status === 'EM_REVISAO').length,
    taxa: filtered.length > 0 ? Math.round((filtered.filter(p => ['CONCLUIDO', 'APROVADO'].includes(p.status)).length / filtered.length) * 100) : 0,
  }

  const now = new Date()
  const dateLabel = now.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  function printReport() {
    window.print()
  }

  return (
    <div style={{ padding: '28px 24px' }}>
      {/* Print header (only visible when printing) */}
      <div className="print-only" style={{ display: 'none', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Relatório Operacional — OPERANDO</h1>
        <p style={{ margin: '4px 0 0' }}>{dateLabel} · Período: {getPeriodLabel(period)}</p>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }} className="no-print">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0 }}>Relatórios</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 0' }}>{dateLabel}</p>
        </div>
        <button onClick={printReport} className="btn-primary">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
            <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
          </svg>
          Emitir PDF / Imprimir
        </button>
      </div>

      {/* Period filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }} className="no-print">
        {(['hoje', 'semana', 'mes', 'tudo'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`period-btn ${period === p ? 'active' : ''}`}
          >
            {getPeriodLabel(p)}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            className="select"
            style={{ width: 'auto', padding: '7px 32px 7px 12px', fontSize: 13 }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="TODOS">Todos os status</option>
            <option value="DISPONIVEL">Disponível</option>
            <option value="DELEGADO">Delegado</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="EM_PRODUCAO">Em Produção</option>
            <option value="EM_REVISAO">Em Revisão</option>
            <option value="APROVADO">Aprovado</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="ATRASADO">Atrasado</option>
          </select>
        </div>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total',         value: stats.total,       color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
          { label: 'Em Produção',   value: stats.emProducao,  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
          { label: 'Atrasados',     value: stats.atrasados,   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
          { label: 'Concluídos',    value: stats.concluidos,  color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
          { label: 'Em Revisão',    value: stats.emRevisao,   color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
          { label: 'Taxa Conclusão',value: `${stats.taxa}%`,  color: stats.taxa >= 70 ? '#22c55e' : stats.taxa >= 40 ? '#f59e0b' : '#ef4444', bg: 'rgba(59,130,246,0.08)', isText: true },
        ].map(s => (
          <div key={s.label} className="kpi-card" style={{ flexDirection: 'column', gap: 6, padding: 16 }}>
            <div style={{
              fontSize: s.isText ? 22 : 28,
              fontWeight: 800,
              color: s.color,
              background: s.bg,
              borderRadius: 10,
              padding: '10px 14px',
              textAlign: 'center',
              border: `1px solid ${s.color}30`,
              width: '100%',
            }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)' }}>A carregar…</p>
        </div>
      ) : (
        <>
          {/* Main table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: 0 }}>
                {getPeriodLabel(period)} — {filtered.length} projeto{filtered.length !== 1 ? 's' : ''}
              </h2>
              {statusFilter !== 'TODOS' && (
                <button onClick={() => setStatusFilter('TODOS')} style={{ background: 'none', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                  × Limpar filtro
                </button>
              )}
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                Nenhum projeto encontrado para os filtros selecionados.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Projeto</th>
                      <th>Responsável</th>
                      <th>Prazo</th>
                      <th>Prioridade</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p: any) => {
                      const days = daysUntil(p.deadline)
                      return (
                        <tr key={p.id} onClick={() => router.push(`/projetos/${p.id}`)} style={{ cursor: 'pointer' }}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'white' }}>{p.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.client}</div>
                          </td>
                          <td>
                            {p.assignedToName ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div className="avatar" style={{ width: 24, height: 24, fontSize: 9 }}>{p.assignedToAvatar}</div>
                                <span style={{ fontSize: 13 }}>{p.assignedToName}</span>
                              </div>
                            ) : <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>—</span>}
                          </td>
                          <td>
                            <div style={{ fontSize: 13, color: days < 0 ? '#ef4444' : 'var(--text)', fontWeight: days < 0 ? 700 : 400 }}>
                              {formatDate(p.deadline)}
                            </div>
                            {days < 0 && <div style={{ fontSize: 11, color: '#ef4444' }}>{Math.abs(days)}d atrasado</div>}
                            {days >= 0 && days <= 3 && <div style={{ fontSize: 11, color: '#f59e0b' }}>Faltam {days}d</div>}
                          </td>
                          <td><PriorityBadge priority={p.priority} /></td>
                          <td><StatusBadge status={p.status} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sections by status */}
          {[
            { status: 'ATRASADO',   title: 'Projetos Atrasados',          color: '#ef4444',  emptyMsg: 'Sem projetos atrasados.' },
            { status: 'EM_PRODUCAO',title: 'Em Produção',                  color: '#3b82f6',  emptyMsg: 'Nenhum projeto em produção.' },
            { status: 'EM_REVISAO', title: 'Em Revisão',                   color: '#a855f7',  emptyMsg: 'Nenhum projeto em revisão.' },
            { status: 'DELEGADO',   title: 'Aguardam Confirmação',         color: '#f59e0b',  emptyMsg: 'Todos confirmados.' },
            { status: 'CONCLUIDO',  title: 'Concluídos',                   color: '#22c55e',  emptyMsg: 'Nenhum concluído.' },
          ].map(({ status, title, color, emptyMsg }) => {
            const items = filterByPeriod(projects).filter(p => p.status === status)
            if (items.length === 0) return null
            return (
              <div key={status} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}80` }} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'white' }}>{title}</h3>
                  <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color }}>{items.length}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Projeto</th>
                        <th>Responsável</th>
                        <th>Prazo</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((p: any) => {
                        const days = daysUntil(p.deadline)
                        return (
                          <tr key={p.id} onClick={() => router.push(`/projetos/${p.id}`)} style={{ cursor: 'pointer' }}>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 14, color: 'white' }}>{p.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.client}</div>
                            </td>
                            <td>
                              {p.assignedToName ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                  <div className="avatar" style={{ width: 24, height: 24, fontSize: 9 }}>{p.assignedToAvatar}</div>
                                  <span style={{ fontSize: 13 }}>{p.assignedToName}</span>
                                </div>
                              ) : <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>—</span>}
                            </td>
                            <td>
                              <div style={{ fontSize: 13, color: days < 0 ? '#ef4444' : 'var(--text)' }}>
                                {formatDate(p.deadline)}
                              </div>
                              {days < 0 && <div style={{ fontSize: 11, color: '#ef4444' }}>{Math.abs(days)}d atrasado</div>}
                            </td>
                            <td><StatusBadge status={p.status} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
