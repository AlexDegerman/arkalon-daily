import type { Metadata, Viewport } from 'next'
import { ClientShell } from '@/components/layout/ClientShell'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#080b10',
  colorScheme: 'dark'
}

export const metadata: Metadata = {
  title: 'Arkalon Daily',
  description: 'Five optional daily puzzles across five skill categories.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://daily.arkalon.fi'
  ),
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/brand/arkalon-daily-icon-32.svg',
        media: '(prefers-color-scheme: light)',
        type: 'image/svg+xml'
      },
      {
        url: '/brand/arkalon-daily-emblem.svg',
        media: '(prefers-color-scheme: dark)',
        type: 'image/svg+xml'
      }
    ],
    apple: '/brand/arkalon-daily-app-icon.svg'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Arkalon Daily'
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg-base text-text-primary">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  )
}
