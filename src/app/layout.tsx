import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Arkalon Daily',
  description: 'Five optional daily puzzles across five skill categories.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://daily.rpsleague.fi'
  )
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg-base text-text-primary">{children}</body>
    </html>
  )
}
