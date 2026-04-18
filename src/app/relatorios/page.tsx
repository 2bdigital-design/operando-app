'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { formatDate, daysUntil } from '@/lib/utils'

export default function RelatoriosPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects').then(r => {
      if (r.status === 401) { router.push('/'); return null }
      return r.json()
    }).then(d => { if (d) { setProjects(d); setLoading(false) } })
  }, [])

  const today = new Date(); today.setHours(0,0,0,0)
  const emProducao = projects.filter(p => p.status === 'EM_PRODUCAO')
  const atrasados = projects.filter(p => p.status === 'ATRASADO')
  const concluidosHoje = projects.filter(p => {
    if (p.status !== 'CONCLUIDO' || !p.completedAt) return false
    const d = new Date(p.completedAt); d.setHours(0,0,0,0)
    return d.getTime() === today.getTime()
  })
  const naoConfirmados = projects.filter(p => p.status === 'DELEGADO')

  const Section = ({ title, items, emptyMsg, color }: any) => (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0f172a' }}>{title}</h2>
        <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color }}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>{emptyMsg}</p>
      ) : (
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
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.client}</div>
                  </td>
                  <td>
                    {p.assignedToName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{p.assignedToAvatar}</div>
                        <span style={{ fontSize: 13 }}>{p.assignedToName}</span>
                      </div>
                    ) : <span style={{ color: '#94a3b8', fontSize: 13 }}>—</span>}
                  </td>
                  <td>
                    <div style={{ fontSize: 13, color: days < 0 ? '#dc2626' : '#0f172a', fontWeight: days < 0 ? 700 : 400 }}>
                      {formatDate(p.deadline)}
                    </div>
                    {days < 0 && <div style={{ fontSize: 11, color: '#dc2626' }}>{Math.abs(days)}d atrasado</div>}
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>Relatório Operacional</h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>
          {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Summary boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Em Produção',    value: emProducao.length,    color: '#1d4ed8', bg: '#eff6ff' },
          { label: 'Atrasados',      value: atrasados.length,     color: '#dc2626', bg: '#fef2f2' },
          { label: 'Concluídos Hoje',value: concluidosHoje.length,color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Sem Confirmação',value: naoConfirmados.length,color: '#d97706', bg: '#fffbeb' },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-icon" style={{ background: s.bg, width: 44, height: 44 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: s.color, opacity: 0.7 }} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? <div style={{ color: '#64748b' }}>A carregar…</div> : (
        <>
          <Section title="Em Produção" items={emProducao} emptyMsg="Nenhum projeto em produção." color="#1d4ed8" />
          <Section title="Projetos Atrasados" items={atrasados} emptyMsg="Sem projetos atrasados." color="#dc2626" />
          <Section title="Concluídos Hoje" items={concluidosHoje} emptyMsg="Nenhum concluído hoje." color="#16a34a" />
          <Section title="Não Confirmados (aguardam resposta)" items={naoConfirmados} emptyMsg="Todos os projetos foram confirmados." color="#d97706" />
        </>
      )}
    </div>
  )
}
