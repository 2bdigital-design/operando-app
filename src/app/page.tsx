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
    router.push(data.role === 'GESTOR' ? '/dashboard' : '/meus-projetos')
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)' }}>
      <div className="hidden lg:flex flex-col justify-center px-16 w-1/2 text-white">
        <div className="mb-8">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 10 }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700 }}>OPERANDO</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
            Disciplina operacional<br />digital
          </h1>
          <p style={{ fontSize: 16, opacity: 0.8, lineHeight: 1.6 }}>
            Controlo total da sua equipa. Responsabilidade clara,<br />
            execução garantida, relatórios automáticos.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            'Delegação com confirmação obrigatória',
            'Alertas automáticos de atraso',
            'Relatório diário às 16:30',
            'Dashboard em tempo real',
          ].map(text => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, opacity: 0.9 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />
              <span>{text}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 48, padding: '16px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 13 }}>
          <p style={{ marginBottom: 4, fontWeight: 600 }}>Acesso</p>
          <p style={{ opacity: 0.8, margin: 0 }}>Entre com as credenciais fornecidas pelo seu gestor</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div style={{ background: 'white', borderRadius: 20, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
          <div className="text-center mb-8">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ background: '#1d4ed8', borderRadius: 10, padding: 8 }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#1e3a8a' }}>OPERANDO</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '8px 0 4px' }}>Bem-vindo de volta</h2>
            <p style={{ fontSize: 14, color: '#64748b' }}>Entre na sua conta para continuar</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="email@empresa.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>{error}</div>
            )}
            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '12px', fontSize: 15 }} disabled={loading}>
              {loading ? 'A entrar…' : 'Entrar no sistema'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
