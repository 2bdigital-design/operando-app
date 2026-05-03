'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  userId: string
  userName: string
  userAvatar: string
  userRole: string
  content: string
  createdAt: string
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    GESTOR:      { label: 'Gestor',      color: '#fca5a5', bg: 'rgba(239,68,68,0.15)' },
    LIDER:       { label: 'Líder',       color: '#fcd34d', bg: 'rgba(245,158,11,0.15)' },
    SUPERVISOR:  { label: 'Supervisor',  color: '#d8b4fe', bg: 'rgba(168,85,247,0.15)' },
    COLABORADOR: { label: 'Colaborador', color: '#93c5fd', bg: 'rgba(59,130,246,0.15)' },
  }
  const s = map[role] || map.COLABORADOR
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
      color: s.color, background: s.bg, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {s.label}
    </span>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoje'
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })
}

export default function ChatPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMsgTime = useRef<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.error) { router.push('/'); return }
      setSession(d)
    })
    loadMessages()
    pollRef.current = setInterval(pollMessages, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const res = await fetch('/api/chat')
    if (res.status === 401) { router.push('/'); return }
    const data = await res.json()
    setMessages(data)
    if (data.length > 0) lastMsgTime.current = data[data.length - 1].createdAt
  }

  async function pollMessages() {
    const url = lastMsgTime.current ? `/api/chat?since=${encodeURIComponent(lastMsgTime.current)}` : '/api/chat'
    const res = await fetch(url)
    if (!res.ok) return
    const data = await res.json()
    if (data.length > 0) {
      setMessages(prev => {
        const ids = new Set(prev.map((m: Message) => m.id))
        const newMsgs = data.filter((m: Message) => !ids.has(m.id))
        if (newMsgs.length === 0) return prev
        lastMsgTime.current = newMsgs[newMsgs.length - 1].createdAt
        return [...prev, ...newMsgs]
      })
    }
  }

  async function send() {
    if (!text.trim() || sending) return
    setSending(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim() }),
    })
    setSending(false)
    if (res.ok) {
      const msg = await res.json()
      setText('')
      setMessages(prev => {
        const ids = new Set(prev.map((m: Message) => m.id))
        if (ids.has(msg.id)) return prev
        lastMsgTime.current = msg.createdAt
        return [...prev, msg]
      })
    }
  }

  async function deleteMsg(id: string) {
    await fetch('/api/chat', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: id }),
    })
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  // Group messages by day
  const grouped: { day: string; msgs: Message[] }[] = []
  messages.forEach(m => {
    const day = formatDay(m.createdAt)
    const last = grouped[grouped.length - 1]
    if (last && last.day === day) {
      last.msgs.push(m)
    } else {
      grouped.push({ day, msgs: [m] })
    }
  })

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--glass-border)',
        background: 'rgba(4, 8, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(29,78,216,0.2) 100%)',
          border: '1px solid rgba(59,130,246,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#60a5fa" strokeWidth="1.8" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Chat da Equipa</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Comunicação em tempo real</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Online</span>
        </div>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-faint)', fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            Nenhuma mensagem ainda. Seja o primeiro a escrever!
          </div>
        )}

        {grouped.map(group => (
          <div key={group.day}>
            {/* Day separator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              margin: '16px 0 12px',
            }}>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
              <span style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-faint)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                padding: '4px 12px',
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                borderRadius: 20,
              }}>
                {group.day}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.msgs.map((msg, i) => {
                const isOwn = msg.userId === session?.userId
                const prevSameAuthor = i > 0 && group.msgs[i - 1].userId === msg.userId
                return (
                  <div
                    key={msg.id}
                    className={isOwn ? 'chat-bubble-own' : 'chat-bubble'}
                    style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start' }}
                  >
                    {/* Avatar — show only if first message from this user in sequence */}
                    {!isOwn && !prevSameAuthor && (
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 11, flexShrink: 0, alignSelf: 'flex-end' }}>
                        {msg.userAvatar}
                      </div>
                    )}
                    {!isOwn && prevSameAuthor && (
                      <div style={{ width: 32, flexShrink: 0 }} />
                    )}

                    <div style={{ maxWidth: '100%' }}>
                      {!isOwn && !prevSameAuthor && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{msg.userName}</span>
                          <RoleBadge role={msg.userRole} />
                        </div>
                      )}
                      <div className="chat-bubble-content" style={{ position: 'relative' }}>
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {msg.content}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{formatTime(msg.createdAt)}</span>
                          {session?.role === 'GESTOR' && (
                            <button
                              onClick={() => deleteMsg(msg.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 11, padding: 0 }}
                              title="Apagar mensagem"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {isOwn && (
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 11, flexShrink: 0, alignSelf: 'flex-end' }}>
                        {msg.userAvatar}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--glass-border)',
        background: 'rgba(4, 8, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          background: 'rgba(6, 12, 26, 0.7)',
          border: '1px solid var(--glass-border)',
          borderRadius: 14,
          padding: '8px 12px',
          transition: 'border-color 0.2s',
        }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder="Escreva uma mensagem… (Enter para enviar)"
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: 14,
              resize: 'none',
              lineHeight: 1.5,
              maxHeight: 120,
              overflowY: 'auto',
              fontFamily: 'inherit',
              padding: '4px 0',
            }}
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: 13, flexShrink: 0, borderRadius: 10 }}
          >
            {sending ? (
              <span className="spinner" style={{ width: 14, height: 14 }} />
            ) : (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '6px 0 0', textAlign: 'center' }}>
          Shift+Enter para nova linha · Enter para enviar
        </p>
      </div>
    </div>
  )
}
