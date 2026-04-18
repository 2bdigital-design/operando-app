import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ProjectStatus } from './db'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  DISPONIVEL: 'Disponível',
  DELEGADO: 'Delegado',
  CONFIRMADO: 'Confirmado',
  EM_PRODUCAO: 'Em Produção',
  EM_REVISAO: 'Em Revisão',
  APROVADO: 'Aprovado',
  CONCLUIDO: 'Concluído',
  ATRASADO: 'Atrasado',
}

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  DISPONIVEL: 'bg-slate-100 text-slate-700',
  DELEGADO: 'bg-blue-100 text-blue-700',
  CONFIRMADO: 'bg-indigo-100 text-indigo-700',
  EM_PRODUCAO: 'bg-cyan-100 text-cyan-700',
  EM_REVISAO: 'bg-amber-100 text-amber-700',
  APROVADO: 'bg-emerald-100 text-emerald-700',
  CONCLUIDO: 'bg-green-100 text-green-700',
  ATRASADO: 'bg-red-100 text-red-700',
}

export const PRIORITY_LABELS: Record<string, string> = {
  ALTA: 'Alta',
  MEDIA: 'Média',
  BAIXA: 'Baixa',
}

export const PRIORITY_COLORS: Record<string, string> = {
  ALTA: 'bg-red-100 text-red-700',
  MEDIA: 'bg-amber-100 text-amber-700',
  BAIXA: 'bg-slate-100 text-slate-600',
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function daysUntil(iso: string): number {
  const now = new Date()
  const deadline = new Date(iso)
  const diff = deadline.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isOverdue(iso: string): boolean {
  return new Date(iso) < new Date()
}
