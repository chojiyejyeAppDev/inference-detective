# 추론 탐정 (Inference Detective) — Agent Guide

## 프로젝트 개요
수능 비문학 추론 학습 앱. 드래그&드롭으로 추론 경로 조립. 7레벨. 프리미엄 구독(일 5문제 무료 / 유료 무제한).

**프로덕션 URL:** https://inference-detective.vercel.app
**GitHub:** https://github.com/chojiyejyeAppDev/inference-detective
**Supabase 프로젝트:** dnfravwzyxiqpuawuyjh

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) + TypeScript |
| 스타일 | TailwindCSS + shadcn/ui |
| 드래그&드롭 | @hello-pangea/dnd |
| 애니메이션 | Framer Motion |
| DB + Auth | Supabase (PostgreSQL + Auth) |
| 결제 | Toss Payments Billing API |
| 차트 | Recharts |
| 배포 | Vercel (main 브랜치 자동 배포) |

---

## 프로젝트 구조

```
app/
  page.tsx                        # 랜딩
  pricing/page.tsx                # 구독 플랜
  (auth)/login / signup           # 인증
  (game)/levels                   # 레벨 선택 (로그인 필요)
  (game)/play/[questionId]        # 게임 화면
  (game)/dashboard                # 성장 대시보드 (유료)
  api/game/question               # 문제 조회 (일일 제한)
  api/game/evaluate               # 체인 평가 + 레벨업 판정
  api/game/hint                   # 힌트 요청
  api/payment/subscribe|webhook|cancel  # Toss 결제
  api/invite/generate|redeem      # 초대 코드

components/game/   # GameBoard, SentenceCard, InferenceSlot, ConnectionIndicator
components/level/  # LevelGrid
components/dashboard/ # AccuracyChart, ErrorPatternCard, HintDependencyChart

lib/supabase/client.ts   # 브라우저용
lib/supabase/server.ts   # 서버 컴포넌트/API용
lib/game/evaluator.ts    # 체인 평가 알고리즘
lib/game/levelConfig.ts  # 7레벨 설정
lib/payment/toss.ts      # Toss Payments 클라이언트

scripts/seed-questions.ts  # 문제 데이터 시딩
supabase/migrations/       # DB 스키마
```

---

## 환경변수 (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://dnfravwzyxiqpuawuyjh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_placeholder   # ⚠️ 실제 키로 교체 필요
TOSS_SECRET_KEY=test_sk_placeholder               # ⚠️ 실제 키로 교체 필요
TOSS_WEBHOOK_SECRET=placeholder-webhook-secret    # ⚠️ 실제 키로 교체 필요
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 현재 구현 상태

### ✅ 완료
- [x] 전체 DB 스키마 (profiles, questions, user_progress, subscriptions, invitations)
- [x] Supabase Auth (Email + Google OAuth)
- [x] 7레벨 게임 엔진 (드래그&드롭, 체인 평가, 연결 강도 표시)
- [x] 힌트 시스템 (4단계)
- [x] 서버사이드 일일 제한 API (무료 5문제)
- [x] 레벨업 로직 (3세션 80% 이상)
- [x] Toss Payments API 클라이언트 구조 (키 미설정)
- [x] 초대 코드 시스템 API
- [x] 성장 대시보드 컴포넌트 (Recharts)
- [x] 랜딩 페이지 (Framer Motion 애니메이션)
- [x] Vercel 프로덕션 배포
- [x] 문제 데이터 시딩 (레벨1×3, 레벨2×2, 레벨3×1 = 총 6문제)

### ❌ 미완성 / 우선 작업 대상
- [ ] **[P0] 문제 데이터 부족** — 레벨4~7 문제 없음. 레벨당 최소 10문제 필요
- [ ] **[P0] Toss Payments 실결제** — 플레이스홀더 키. 실제 키 설정 후 결제 플로우 테스트
- [ ] **[P1] 레벨업 애니메이션** — LevelUpAnimation 컴포넌트 미구현
- [ ] **[P1] 이메일 알림** — 초대 성공 시 이메일 발송 (Resend 추천)
- [ ] **[P1] 에러 모니터링** — Sentry 연동
- [ ] **[P2] 관리자 패널** — 문제 CRUD, 사용자 관리
- [ ] **[P2] 커스텀 도메인** — Vercel에서 도메인 연결
- [ ] **[P2] 분석 도구** — Mixpanel 또는 PostHog 연동
- [ ] **[P3] 모바일 최적화** — 태블릿/폰 반응형 개선
- [ ] **[P3] PWA 지원** — 오프라인 캐싱

---

## 코딩 규칙

### 일반
- TypeScript strict 모드 준수. `any` 사용 금지
- 서버 컴포넌트 기본, 클라이언트 컴포넌트는 `'use client'` 명시
- API Route는 반드시 Supabase 서버 클라이언트로 인증 확인 후 처리
- 환경변수는 항상 `.env.local`에서 읽음. 하드코딩 금지

### Supabase
- 브라우저: `lib/supabase/client.ts`의 `createClient()` 사용
- 서버/API: `lib/supabase/server.ts`의 `createServerClient()` 사용
- DB 스키마 변경 시 `supabase/migrations/` 에 SQL 파일 추가

### 컴포넌트
- shadcn/ui 컴포넌트 우선 사용 (`npx shadcn-ui@latest add <component>`)
- TailwindCSS 클래스만 사용. 인라인 style 지양
- 다크 테마 기준 (배경: `bg-slate-900`, 강조: `amber-400`)

### API Routes
```typescript
// 인증 체크 패턴 (모든 게임/결제 API에 적용)
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

---

## 문제 데이터 추가 방법

문제는 `scripts/seed-questions.ts`의 `QUESTIONS` 배열에 추가 후 실행:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://dnfravwzyxiqpuawuyjh.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
npx tsx scripts/seed-questions.ts
```

### 문제 구조
```typescript
{
  difficulty_level: 1~7,   // 레벨
  topic: 'humanities' | 'social' | 'science' | 'tech' | 'arts',
  passage: string,          // 지문 (3~7문장)
  sentences: [              // 보기 카드 (정답 + 오답 1~2개)
    { id: 'a', text: string },
    { id: 'b', text: string },
    { id: 'c', text: string },
    { id: 'd', text: string },  // 오답
  ],
  conclusion: string,       // 결론 (화면 하단 표시)
  correct_chain: string[],  // 정답 순서 ['a', 'b', 'c']
  hints: [                  // 힌트 (level 1~4)
    { level: 1, text: string },
    { level: 2, text: string },
    { level: 3, text: string },
  ],
}
```

### 레벨별 난이도 기준
| 레벨 | 슬롯 수 | 힌트 | 소재 |
|------|---------|------|------|
| 1 | 3 | 직접 | 일상/기초 인과 |
| 2 | 3 | 직접 | 부분 추상 개념 |
| 3 | 4 | 반직접 | 수식어/종속절 포함 |
| 4 | 4 | 반직접 | 모의고사 수준 |
| 5 | 5 | 간접 | 대조/역전 논리 |
| 6 | 6 | 간접 | 수능 실전 |
| 7 | 7 | 없음 | 고난도 추상 |

---

## 배포 프로세스

```bash
# 1. 로컬 개발
npm run dev

# 2. 빌드 확인
npm run build

# 3. 배포 (main 브랜치 push → Vercel 자동 배포)
git add .
git commit -m "feat: <변경 내용>"
git push origin main

# Vercel 즉시 배포 (CLI)
npx vercel --prod --yes
```

**자동 배포:** `main` 브랜치에 push하면 Vercel이 자동으로 빌드/배포
**프리뷰 배포:** 다른 브랜치 push 시 preview URL 자동 생성

---

## 작업 우선순위 큐 (Agent Task Queue)

에이전트는 아래 순서대로 작업하고, 각 작업 완료 시 이 파일의 체크박스를 업데이트하세요.

### P0 — 즉시 필요 (서비스 운영 불가)
1. **문제 데이터 확장**: 레벨 4~7 각각 10문제 이상 생성 후 시딩
   - 수능 비문학 주제: 인문/사회/과학/기술/예술
   - `scripts/seed-questions.ts`에 추가 후 시딩 스크립트 실행
2. **Toss Payments 연동 완성**: `NEXT_PUBLIC_TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY` 실제 키 설정
   - `lib/payment/toss.ts` 검토 및 실결제 테스트

### P1 — 핵심 UX
3. **LevelUpAnimation 컴포넌트** 구현
   - `components/level/LevelUpAnimation.tsx` 생성
   - Framer Motion으로 레벨업 시 전화면 축하 애니메이션
4. **이메일 알림** (Resend API)
   - 회원가입 환영 이메일
   - 초대 성공 알림 이메일
5. **에러 모니터링** (Sentry)
   - `npm install @sentry/nextjs`
   - `SENTRY_DSN` 환경변수 추가

### P2 — 프로덕션 완성도
6. **관리자 패널** `/admin`
   - 문제 목록 조회/추가/수정/삭제
   - 사용자 목록 및 구독 현황
   - Supabase RLS로 admin 역할만 접근 가능
7. **분석 도구** (PostHog 추천 — 무료 플랜)
   - 페이지뷰, 퍼널(가입→결제) 추적
8. **SEO 개선**
   - `app/sitemap.ts` 생성
   - OG 이미지 동적 생성 (`/api/og`)

### P3 — 고도화
9. **PWA** — `next-pwa` 설치, 서비스워커 설정
10. **모바일 최적화** — 480px 이하 레이아웃 개선
11. **소셜 공유** — 결과 카드 이미지 생성 후 카카오/트위터 공유

---

## 테스트 방법

```bash
# 전체 플로우 검증
1. https://inference-detective.vercel.app 접속
2. /signup → 회원가입
3. /levels → 레벨 1 선택
4. /play/[id] → 드래그&드롭으로 체인 조립 → 제출
5. 5문제 풀기 → 일일 한도 배너 확인
6. /pricing → 구독 플랜 확인
```

---

## 자주 쓰는 명령어

```bash
# 개발 서버
npm run dev

# 타입 체크
npx tsc --noEmit

# 문제 시딩
NEXT_PUBLIC_SUPABASE_URL="https://dnfravwzyxiqpuawuyjh.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<key>" \
npx tsx scripts/seed-questions.ts

# Vercel 배포
npx vercel --prod --yes

# shadcn 컴포넌트 추가
npx shadcn-ui@latest add <component-name>
```
