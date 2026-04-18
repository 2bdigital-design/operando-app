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

  const concluidos = projects.filter(p => ['CONCLUIDO', 'APROVADO'].includes(p.status))
    .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>Histórico</h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>{concluidos.length} projeto{concluidos.length !== 1 ? 's' : ''} concluído{concluidos.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? <div style={{ color: '#64748b' }}>A carregar…</div> : concluidos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 56, height: 56, background: '#f0fdf4', borderRadius: 12, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, border: '2px solid #86efac', borderRadius: '50%' }} />
          </div>
          <p style={{ color: '#64748b', margin: 0, fontWeight: 500 }}>Nenhum projeto concluído ainda</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Projeto</th>
                <th>Iniciado</th>
                <th>Concluído</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {concluidos.map(p => (
                <tr key={p.id} onClick={() => router.push(`/projetos/${p.id}`)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.client}</div>
                  </td>
                  <td style={{ fontSize: 13, color: '#64748b' }}>{formatDate(p.startedAt)}</td>
                  <td style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>{formatDateTime(p.completedAt)}</td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
