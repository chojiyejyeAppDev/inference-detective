import type { Metadata, Viewport } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import { Toaster } from 'sonner'
import { Suspense } from 'react'
import PostHogProvider from '@/components/providers/PostHogProvider'
import GlobalNav from '@/components/layout/GlobalNav'
import './globals.css'

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-kr',
})

export const viewport: Viewport = {
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: '이:르다 — 수능 비문학 추론 훈련',
  description: '드래그&드롭으로 추론 경로를 조립하며 수능 비문학 논리력을 훈련하는 학습 게임',
  keywords: ['수능', '비문학', '추론', '논리', '국어', '학습', '게임', '이르다'],
  metadataBase: new URL('https://inference-detective.vercel.app'),
  openGraph: {
    title: '이:르다 — 수능 비문학 추론 훈련',
    description: '드래그&드롭으로 추론 경로를 조립하며 수능 비문학 논리력을 훈련하는 학습 게임',
    url: 'https://inference-detective.vercel.app',
    siteName: '이:르다',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '이:르다 — 수능 비문학 추론 훈련',
    description: '드래그&드롭으로 추론 경로를 조립하며 수능 비문학 논리력을 훈련하는 학습 게임',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className={`${notoSansKR.variable} font-sans antialiased`}>
        <a href="#main-content" className="skip-nav">본문으로 건너뛰기</a>
        <Suspense fallback={null}>
          <PostHogProvider>
            <GlobalNav />
            <main id="main-content">
              {children}
            </main>
          </PostHogProvider>
        </Suspense>
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#e2e8f0',
            },
          }}
        />
      </body>
    </html>
  )
}
