/**
 * 저장 실패한 문제 복구 스크립트
 *
 * 사용법:
 *   1. 로컬 덤프 파일에서 복구:
 *      npx tsx scripts/recover-questions.ts .question-dumps/questions-2026-03-09T01-17-00.json
 *
 *   2. GitHub Actions 로그에서 복구:
 *      gh run view <RUN_ID> --log | grep -oP '(?<=\[RECOVERY_DUMP_START\]).*(?=\[RECOVERY_DUMP_END\])' > recovered.json
 *      npx tsx scripts/recover-questions.ts recovered.json
 *
 *   3. 직접 JSON 파일 지정:
 *      npx tsx scripts/recover-questions.ts my-questions.json
 *
 * 환경변수:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase 환경변수가 필요합니다.')
  process.exit(1)
}

interface Question {
  difficulty_level: number
  topic: string
  passage: string
  sentences: { id: string; text: string }[]
  conclusion: string
  correct_chain: string[]
  hints: { level: number; text: string }[]
  detailed_explanation?: string
  wrong_answer_analysis?: { sentence_id: string; why_wrong: string }[]
  chain_explanations?: string[]
  source?: string
  source_url?: string
}

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('사용법: npx tsx scripts/recover-questions.ts <JSON파일경로>')
    console.error('')
    console.error('로컬 덤프 목록:')
    const dumpDir = path.resolve(__dirname, '..', '.question-dumps')
    if (fs.existsSync(dumpDir)) {
      const files = fs.readdirSync(dumpDir).filter((f) => f.endsWith('.json'))
      if (files.length === 0) {
        console.error('  (없음)')
      } else {
        for (const f of files) {
          const stat = fs.statSync(path.join(dumpDir, f))
          console.error(`  ${f}  (${Math.round(stat.size / 1024)}KB)`)
        }
      }
    } else {
      console.error('  .question-dumps/ 폴더가 없습니다')
    }
    process.exit(1)
  }

  const resolved = path.resolve(filePath)
  if (!fs.existsSync(resolved)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${resolved}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(resolved, 'utf-8').trim()
  let questions: Question[]
  try {
    questions = JSON.parse(raw)
  } catch {
    console.error('❌ JSON 파싱 실패')
    process.exit(1)
  }

  if (!Array.isArray(questions)) {
    console.error('❌ 파일이 배열 형식이 아닙니다')
    process.exit(1)
  }

  console.log(`📦 ${questions.length}개 문제 복구 시작\n`)

  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)
  let saved = 0
  let skipped = 0

  for (const q of questions) {
    // 중복 체크: 같은 conclusion이 이미 있으면 건너뜀
    const { data: existing } = await supabase
      .from('questions')
      .select('id')
      .eq('conclusion', q.conclusion)
      .eq('difficulty_level', q.difficulty_level)
      .limit(1)

    if (existing && existing.length > 0) {
      console.log(`  ⏭️  이미 존재 (L${q.difficulty_level} ${q.topic}): "${q.conclusion.slice(0, 40)}..."`)
      skipped++
      continue
    }

    const { error } = await supabase.from('questions').insert({
      difficulty_level: q.difficulty_level,
      topic: q.topic,
      passage: q.passage,
      sentences: q.sentences,
      conclusion: q.conclusion,
      correct_chain: q.correct_chain,
      hints: q.hints,
      detailed_explanation: q.detailed_explanation || null,
      wrong_answer_analysis: q.wrong_answer_analysis || null,
      chain_explanations: q.chain_explanations || null,
      source: q.source || null,
      source_url: q.source_url || null,
    })

    if (error) {
      console.error(`  ❌ 실패 (L${q.difficulty_level} ${q.topic}): ${error.message}`)
    } else {
      console.log(`  ✅ 저장 (L${q.difficulty_level} ${q.topic}): "${q.conclusion.slice(0, 40)}..."`)
      saved++
    }
  }

  console.log(`\n═══ 복구 결과 ═══`)
  console.log(`  저장: ${saved}개`)
  console.log(`  중복 건너뜀: ${skipped}개`)
  console.log(`  실패: ${questions.length - saved - skipped}개`)
}

main().catch((err) => {
  console.error('❌ 실행 오류:', err)
  process.exit(1)
})
