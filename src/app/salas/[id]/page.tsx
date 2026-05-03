'use client'
import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

export default function SalaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  useEffect(() => { router.replace(`/clientes/${id}`) }, [id, router])
  return null
}
