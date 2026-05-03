'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Erro ao entrar'); return }
    if (data.role === 'COLABORADOR') {
      router.push('/meus-projetos')
    } else {
      router.push('/dashboard')
    }
  }

  const features = [
    'Delegação com confirmação obrigatória',
    'Alertas automáticos de atraso',
    'Relatório diário às 16:30',
    'Dashboard em tempo real',
    'Chat de equipa integrado',
    'Supervisores com visibilidade total',
  ]

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)',
      backgroundImage: `
        radial-gradient(ellipse at 15% 50%, rgba(59,130,246,0.12) 0%, transparent 55%),
        radial-gradient(ellipse at 85% 20%, rgba(29,78,216,0.1) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.05) 0%, transparent 60%)
      `,
    }}>
      {/* Left panel — hidden on mobile */}
      <div style={{
        display: 'none',
        flex: '0 0 50%',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '64px',
        position: 'relative',
        overflow: 'hidden',
      }} className="login-left-panel">
        {/* Decorative glow orbs */}
        <div style={{
          position: 'absolute', top: '15%', left: '10%',
          width: 300, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '5%',
          width: 200, height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Glass panel */}
        <div style={{
          background: 'rgba(12, 24, 52, 0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(59,130,246,0.18)',
          borderRadius: 24,
          padding: '40px 44px',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              borderRadius: 12,
              padding: 10,
              boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
            }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>OPERANDO</span>
          </div>

          <h1 style={{ fontSize: 34, fontWeight: 800, color: 'white', lineHeight: 1.2, margin: '0 0 14px' }}>
            Disciplina operacional<br />
            <span style={{ color: '#60a5fa' }}>digital</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 36px' }}>
            Controlo total da sua equipa. Responsabilidade clara,<br />
            execução garantida, relatórios automáticos.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {features.map(text => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--text-muted)' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="10" height="10" fill="none" viewBox="0 0 10 10">
                    <path d="M2 5l2 2 4-4" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div style={{
            padding: '14px 18px',
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: 12,
            fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            <span style={{ fontWeight: 600, color: '#93c5fd' }}>Acesso: </span>
            Entre com as credenciais fornecidas pelo seu gestor
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
      }}>
        <div style={{
          background: 'rgba(12, 24, 52, 0.7)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(59,130,246,0.22)',
          borderRadius: 24,
          padding: '44px 40px',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 0 60px rgba(59,130,246,0.15), 0 24px 48px rgba(0,0,0,0.4)',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: 12,
                padding: 9,
                boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
              }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>OPERANDO</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: '0 0 6px' }}>Bem-vindo de volta</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Entre na sua conta para continuar</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="email@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5',
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{ justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 4 }}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  A entrar…
                </span>
              ) : 'Entrar no sistema'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-faint)', margin: '24px 0 0' }}>
            Credenciais fornecidas pelo gestor da equipa
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .login-left-panel {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  )
}
