import { NextRequest, NextResponse } from 'next/server'
import { login, encodeSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  const user = login(email, password)
  if (!user) {
    return NextResponse.json({ error: 'Email ou password incorretos' }, { status: 401 })
  }
  const token = encodeSession(user)
  const res = NextResponse.json({ role: user.role, name: user.name })
  res.cookies.set('gestao_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
