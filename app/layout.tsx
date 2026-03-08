import type { Metadata, Viewport } from 'next'
import { Noto_Sans_KR, Noto_Serif_KR } from 'next/font/google'
import { Toaster } from 'sonner'
import { Suspense } from 'react'
import PostHogProvider from '@/components/providers/PostHogProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import GlobalNav from '@/components/layout/GlobalNav'
import './globals.css'

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
})

const notoSerifKR = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-noto-serif-kr',
  display: 'swap',
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
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${notoSansKR.variable} ${notoSerifKR.variable} font-sans antialiased`}>
        <a href="#main-content" className="skip-nav">본문으로 건너뛰기</a>
        <Suspense fallback={null}>
          <PostHogProvider>
            <ThemeProvider>
              <GlobalNav />
              <main id="main-content">
                {children}
              </main>
            </ThemeProvider>
          </PostHogProvider>
        </Suspense>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              border: '1px solid #E7E5E0',
              color: '#1C1917',
              fontFamily: 'var(--font-noto-sans-kr)',
            },
          }}
        />
      </body>
    </html>
  )
}
