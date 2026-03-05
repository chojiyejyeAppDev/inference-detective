/**
 * 테스트 계정 생성 스크립트
 * 실행: npx tsx scripts/create-test-users.ts
 *
 * 환경변수 필요:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TestUser {
  email: string
  password: string
  nickname: string
  role: 'pg_reviewer' | 'dev' | 'admin'
  description: string
  subscriptionStatus?: 'free' | 'active'
}

const TEST_USERS: TestUser[] = [
  {
    email: 'pg-test@2onlab.com',
    password: 'pgtest2026!',
    nickname: 'PG심사관',
    role: 'pg_reviewer',
    description: 'PG 심사용 테스트 계정 (결제 플로우 확인용)',
    subscriptionStatus: 'free',
  },
  {
    email: 'dev-test@2onlab.com',
    password: 'devtest2026!',
    nickname: '개발테스트',
    role: 'dev',
    description: '개발/디버깅용 테스트 계정',
    subscriptionStatus: 'active',
  },
  {
    email: 'admin@2onlab.com',
    password: 'admin2026!',
    nickname: '관리자',
    role: 'admin',
    description: '관리자 계정',
    subscriptionStatus: 'active',
  },
]

async function createTestUsers() {
  console.log('🔧 테스트 계정 생성 시작...\n')

  for (const user of TEST_USERS) {
    // 기존 유저 확인
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existing = existingUsers?.users?.find((u) => u.email === user.email)

    if (existing) {
      console.log(`⏭️  ${user.email} — 이미 존재 (${user.description})`)
      continue
    }

    // Auth 유저 생성
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // 이메일 인증 자동 완료
    })

    if (error) {
      console.error(`❌ ${user.email} 생성 실패:`, error.message)
      continue
    }

    const userId = data.user.id

    // 프로필 업데이트 (닉네임, 구독 상태)
    const profileUpdate: Record<string, unknown> = {
      nickname: user.nickname,
    }

    if (user.subscriptionStatus === 'active') {
      profileUpdate.subscription_status = 'active'
      profileUpdate.subscription_expires_at = new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString() // 1년 후
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId)

    if (profileError) {
      console.error(`⚠️  ${user.email} 프로필 업데이트 실패:`, profileError.message)
    }

    // admin 역할 설정
    if (user.role === 'admin') {
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'admin' } as Record<string, unknown>)
        .eq('id', userId)

      if (roleError) {
        console.error(`⚠️  ${user.email} 관리자 역할 설정 실패:`, roleError.message)
      }
    }

    console.log(`✅ ${user.email} — 생성 완료 (${user.description})`)
  }

  console.log('\n──────────────────────────────────────')
  console.log('📋 테스트 계정 목록\n')

  for (const user of TEST_USERS) {
    console.log(`  [${user.role.toUpperCase()}] ${user.description}`)
    console.log(`    이메일: ${user.email}`)
    console.log(`    비밀번호: ${user.password}`)
    console.log(`    구독: ${user.subscriptionStatus ?? 'free'}`)
    console.log()
  }

  console.log('──────────────────────────────────────')
  console.log('⚠️  프로덕션 배포 전 비밀번호를 반드시 변경하세요!')
}

createTestUsers().catch(console.error)
