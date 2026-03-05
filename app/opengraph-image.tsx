import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '이:르다 — 수능 비문학 추론 훈련'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
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
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 900,
              color: '#0f172a',
            }}
          >
            르
          </div>
        </div>

        {/* 메인 타이틀 */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: 900,
            color: '#f1f5f9',
            textAlign: 'center',
            lineHeight: 1.2,
            display: 'flex',
          }}
        >
          이:르다
        </div>

        {/* 서브타이틀 */}
        <div
          style={{
            fontSize: '28px',
            color: '#94a3b8',
            marginTop: '12px',
            textAlign: 'center',
            display: 'flex',
          }}
        >
          수능 비문학 추론 훈련
        </div>

        {/* 설명 */}
        <div
          style={{
            fontSize: '20px',
            color: '#64748b',
            marginTop: '24px',
            textAlign: 'center',
            display: 'flex',
            maxWidth: '700px',
          }}
        >
          드래그&드롭으로 추론 경로를 조립하며 논리력을 훈련하세요
        </div>

        {/* 레벨 아이콘들 */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '48px',
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((level) => (
            <div
              key={level}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background:
                  level <= 3
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(100, 116, 139, 0.15)',
                border:
                  level <= 3
                    ? '1px solid rgba(245, 158, 11, 0.4)'
                    : '1px solid rgba(100, 116, 139, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 700,
                color: level <= 3 ? '#fbbf24' : '#475569',
              }}
            >
              {level}
            </div>
          ))}
        </div>

        {/* 하단 */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: '16px',
            color: '#475569',
            display: 'flex',
          }}
        >
          inference-detective.vercel.app
        </div>
      </div>
    ),
    { ...size },
  )
}
