'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Session {
  name: string
  email: string
  role: string
  avatar: string
}

// The same icon used on the Login page
function AppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const ICONS = {
  dashboard: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="14" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="3" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="14" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  ),
  salas: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  projetos: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  equipa: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="19" cy="7" r="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M21 21v-1a3 3 0 00-2-2.83" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  relatorios: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  chat: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  meusprojetos: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  historico: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
}

const gestorLinks = [
  { href: '/dashboard', label: 'Dashboard',  icon: ICONS.dashboard },
  { href: '/salas',     label: 'Salas',       icon: ICONS.salas },
  { href: '/projetos',  label: 'Projetos',    icon: ICONS.projetos },
  { href: '/equipa',    label: 'Equipa',      icon: ICONS.equipa },
  { href: '/relatorios',label: 'Relatórios',  icon: ICONS.relatorios },
  { href: '/chat',      label: 'Chat',        icon: ICONS.chat },
]

const liderLinks = [
  { href: '/dashboard',  label: 'Dashboard', icon: ICONS.dashboard },
  { href: '/projetos',   label: 'Projetos',  icon: ICONS.projetos },
  { href: '/relatorios', label: 'Relatórios',icon: ICONS.relatorios },
  { href: '/equipa',     label: 'Equipa',    icon: ICONS.equipa },
  { href: '/chat',       label: 'Chat',      icon: ICONS.chat },
]

const supervisorLinks = [
  { href: '/dashboard',  label: 'Dashboard', icon: ICONS.dashboard },
  { href: '/projetos',   label: 'Projetos',  icon: ICONS.projetos },
  { href: '/relatorios', label: 'Relatórios',icon: ICONS.relatorios },
  { href: '/chat',       label: 'Chat',      icon: ICONS.chat },
]

const colaboradorLinks = [
  { href: '/meus-projetos', label: 'Meus Projetos', icon: ICONS.meusprojetos },
  { href: '/historico',     label: 'Histórico',     icon: ICONS.historico },
  { href: '/chat',          label: 'Chat',          icon: ICONS.chat },
]

function getRoleBadge(role: string) {
  const map: Record<string, { label: string; className: string }> = {
    GESTOR:      { label: 'Gestor',      className: 'role-badge-gestor' },
    LIDER:       { label: 'Líder',       className: 'role-badge-lider' },
    SUPERVISOR:  { label: 'Supervisor',  className: 'role-badge-supervisor' },
    COLABORADOR: { label: 'Colaborador', className: 'role-badge-colaborador' },
  }
  const s = map[role] || map.COLABORADOR
  return <span className={s.className}>{s.label}</span>
}

function getLinks(role: string) {
  if (role === 'GESTOR') return gestorLinks
  if (role === 'LIDER') return liderLinks
  if (role === 'SUPERVISOR') return supervisorLinks
  return colaboradorLinks
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.error) setSession(d)
      else router.push('/')
    })
  }, [router])

  // Close sidebar whenever route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const links = session ? getLinks(session.role) : []

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button
        className="mobile-hamburger"
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Abrir menu"
      >
        <span className={`hamburger-line ${mobileOpen ? 'open-1' : ''}`} />
        <span className={`hamburger-line ${mobileOpen ? 'open-2' : ''}`} />
        <span className={`hamburger-line ${mobileOpen ? 'open-3' : ''}`} />
      </button>

      {/* Backdrop */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}
        style={{ display: 'flex', flexDirection: 'column', padding: '24px 14px' }}
      >
        {/* Logo — same icon as login page */}
        <div style={{ padding: '0 8px', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              borderRadius: 10,
              padding: 8,
              boxShadow: '0 2px 12px rgba(59,130,246,0.4)',
              flexShrink: 0,
            }}>
              <AppIcon size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.3px', lineHeight: 1 }}>OPERANDO</div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2, fontWeight: 500 }}>Sistema Operacional</div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(59,130,246,0.12)', margin: '0 8px 18px' }} />

        {/* Role badge */}
        {session && (
          <div style={{ padding: '0 8px', marginBottom: 18 }}>
            {getRoleBadge(session.role)}
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {links.map(link => {
            const isActive = pathname === link.href || (link.href !== '/dashboard' && link.href !== '/meus-projetos' && pathname.startsWith(link.href))
            return (
              <a
                key={link.href}
                href={link.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                {link.icon}
                {link.label}
              </a>
            )
          })}
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(59,130,246,0.12)', margin: '14px 8px 12px' }} />

        {/* User + Logout */}
        {session && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', marginBottom: 4 }}>
              <div className="avatar" style={{ width: 32, height: 32, fontSize: 11, flexShrink: 0 }}>
                {session.avatar}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ color: 'white', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session.name}
                </div>
                <div style={{ color: 'var(--text-faint)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session.email}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="sidebar-link"
              style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', color: 'var(--text-faint)' }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sair
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
