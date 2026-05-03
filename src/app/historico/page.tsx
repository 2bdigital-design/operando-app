'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDate, formatDateTime } from '@/lib/utils'

export default function HistoricoPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects').then(r => {
      if (r.status === 401) { router.push('/'); return null }
      return r.json()
    }).then(d => { if (d) { setProjects(d); setLoading(false) } })
  }, [])

  const concluidos = projects
    .filter(p => ['CONCLUIDO', 'APROVADO'].includes(p.status))
    .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())

  return (
    <div style={{ padding: '28px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0 }}>Histórico</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 0' }}>
          {concluidos.length} projeto{concluidos.length !== 1 ? 's' : ''} concluído{concluidos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>A carregar…</p>
        </div>
      ) : concluidos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>Nenhum projeto concluído ainda</p>
          <p style={{ color: 'var(--text-faint)', margin: '4px 0 0', fontSize: 13 }}>Os projetos concluídos aparecerão aqui</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Iniciado</th>
                  <th>Concluído</th>
                  <th>Pontuação</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {concluidos.map(p => (
                  <tr key={p.id} onClick={() => router.push(`/projetos/${p.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'white' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.client}</div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(p.startedAt)}</td>
                    <td style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>{formatDateTime(p.completedAt)}</td>
                    <td>
                      {p.scoredOnTime === true && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>+100 ⭐</span>
                      )}
                      {p.scoredOnTime === false && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>-50 ⏰</span>
                      )}
                      {p.scoredOnTime === null && (
                        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>—</span>
                      )}
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
