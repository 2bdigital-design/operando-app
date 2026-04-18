import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/utils'
import { ProjectStatus } from '@/lib/db'

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className="badge" style={{}} data-color={STATUS_COLORS[status]}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
        borderRadius: 999, fontSize: 12, fontWeight: 600,
        background: getStatusBg(status), color: getStatusText(status),
      }}>
        {STATUS_LABELS[status] || status}
      </span>
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 999, fontSize: 12, fontWeight: 600,
      background: getPriorityBg(priority), color: getPriorityText(priority),
    }}>
      {PRIORITY_LABELS[priority] || priority}
    </span>
  )
}

function getStatusBg(s: ProjectStatus) {
  const map: Record<ProjectStatus, string> = {
    DISPONIVEL: '#f1f5f9', DELEGADO: '#dbeafe', CONFIRMADO: '#e0e7ff',
    EM_PRODUCAO: '#cffafe', EM_REVISAO: '#fef3c7', APROVADO: '#d1fae5',
    CONCLUIDO: '#dcfce7', ATRASADO: '#fee2e2',
  }
  return map[s] || '#f1f5f9'
}

function getStatusText(s: ProjectStatus) {
  const map: Record<ProjectStatus, string> = {
    DISPONIVEL: '#475569', DELEGADO: '#1d4ed8', CONFIRMADO: '#4338ca',
    EM_PRODUCAO: '#0e7490', EM_REVISAO: '#d97706', APROVADO: '#059669',
    CONCLUIDO: '#16a34a', ATRASADO: '#dc2626',
  }
  return map[s] || '#475569'
}

function getPriorityBg(p: string) {
  return p === 'ALTA' ? '#fee2e2' : p === 'MEDIA' ? '#fef3c7' : '#f1f5f9'
}

function getPriorityText(p: string) {
  return p === 'ALTA' ? '#dc2626' : p === 'MEDIA' ? '#d97706' : '#64748b'
}
