'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Session {
  name: string
  email: string
  role: string
  avatar: string
}

const gestorLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/salas', label: 'Salas de Trabalho' },
  { href: '/projetos', label: 'Projetos' },
  { href: '/equipa', label: 'Equipa' },
  { href: '/relatorios', label: 'Relatórios' },
]

const colaboradorLinks = [
  { href: '/meus-projetos', label: 'Meus Projetos' },
  { href: '/historico', label: 'Histórico' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.error) setSession(d)
      else router.push('/')
    })
  }, [router])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const links = session?.role === 'GESTOR' ? gestorLinks : colaboradorLinks

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', padding: '24px 16px' }}>
      {/* Logo */}
      <div style={{ padding: '0 8px', marginBottom: 32 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>OPERANDO</div>
        <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 2, fontWeight: 400 }}>Sistema Operacional</div>
      </div>

      {/* Role badge */}
      {session && (
        <div style={{ padding: '0 8px', marginBottom: 24 }}>
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
            background: session.role === 'GESTOR' ? 'rgba(239,68,68,0.18)' : 'rgba(59,130,246,0.18)',
            color: session.role === 'GESTOR' ? '#fca5a5' : '#93c5fd',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {session.role === 'GESTOR' ? 'Gestor' : 'Colaborador'}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {links.map(link => {
          const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
          return (
            <a key={link.href} href={link.href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
              {link.label}
            </a>
          )
        })}
      </nav>

      {/* User + Logout */}
      {session && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', marginBottom: 4 }}>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 11, flexShrink: 0 }}>{session.avatar}</div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.name}</div>
              <div style={{ color: '#93c5fd', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.email}</div>
            </div>
          </div>
          <button onClick={logout} className="sidebar-link" style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', color: '#93c5fd' }}>
            Sair
          </button>
        </div>
      )}
    </aside>
  )
}
