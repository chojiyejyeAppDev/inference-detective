import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '이:르다 Admin',
  description: 'Admin panel for 이:르다',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  )
}
