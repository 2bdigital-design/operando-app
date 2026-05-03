import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OPERANDO — Sistema de Gestão Operacional',
  description: 'Controlo total da sua operação',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="8" fill="#1d4ed8"/>
    <path d="M10 8h3a3 3 0 006 0h3a2 2 0 012 2v14a2 2 0 01-2 2H10a2 2 0 01-2-2V10a2 2 0 012-2z" fill="none" stroke="white" stroke-width="1.5"/>
    <path d="M13 16l2 2 4-4" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`

  const faviconDataUrl = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`

  return (
    <html lang="pt" className="h-full">
      <head>
        <link rel="icon" type="image/svg+xml" href={faviconDataUrl} />
      </head>
      <body className="h-full">{children}</body>
    </html>
  )
}
