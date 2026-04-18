import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OPERANDO — Sistema de Gestão Operacional',
  description: 'Controlo total da sua operação',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
