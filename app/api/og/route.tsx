import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') ?? '이:르다'
  const subtitle = searchParams.get('subtitle') ?? '수능 비문학 추론 훈련'
  const level = searchParams.get('level')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 배경 장식 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            opacity: 0.06,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-100px',
              right: '-100px',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: '#f59e0b',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-150px',
              left: '-100px',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: '#f59e0b',
            }}
          />
        </div>

        {/* 로고 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 900,
              color: '#0f172a',
            }}
          >
            르
          </div>
          <span
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '2px',
            }}
          >
            이:르다
          </span>
        </div>

        {/* 레벨 뱃지 (있을 때만) */}
        {level && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '9999px',
              padding: '8px 24px',
              marginBottom: '24px',
            }}
          >
            <span style={{ fontSize: '20px', color: '#fbbf24', fontWeight: 700 }}>
              Level {level}
            </span>
          </div>
        )}

        {/* 타이틀 */}
        <div
          style={{
            fontSize: '52px',
            fontWeight: 900,
            color: '#f1f5f9',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: '900px',
            display: 'flex',
          }}
        >
          {title}
        </div>

        {/* 서브타이틀 */}
        <div
          style={{
            fontSize: '24px',
            color: '#64748b',
            marginTop: '16px',
            textAlign: 'center',
            display: 'flex',
          }}
        >
          {subtitle}
        </div>

        {/* 하단 URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: '18px',
            color: '#475569',
            display: 'flex',
          }}
        >
          inference-detective.vercel.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
