# 문제 뱅크 전체 리뉴얼 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 68문제 전체 재작성 + 생성기 프롬프트 개선으로 오답 변별력과 추론 난이도를 수능 실전 수준으로 끌어올린다.

**Architecture:** 생성기(generator.ts)와 검증기(validator.ts)의 레벨 설정을 먼저 통일한 뒤, 문제 뱅크 3파일을 순서대로 재작성한다. 각 파일은 독립적이므로 병렬 작업 가능.

**Tech Stack:** TypeScript, 수능 비문학 콘텐츠

---

## Chunk 1: 인프라 업데이트 (generator + validator)

### Task 1: validator.ts 레벨 설정 통일

**Files:**
- Modify: `lib/papers/validator.ts:1-7`

현재 validator의 LEVEL_SLOTS/LEVEL_HINTS가 실제 문제 뱅크와 불일치:
- L5: slots=5(OK), hints=1(→3으로)
- L6: slots=6(→5로), hints=1(→3으로)
- L7: slots=7(→5로), hints=0(OK)

- [ ] **Step 1: validator.ts 업데이트**

```typescript
const LEVEL_SLOTS: Record<number, number> = {
  1: 3, 2: 3, 3: 4, 4: 4, 5: 5, 6: 5, 7: 5,
}

const LEVEL_HINTS: Record<number, number> = {
  1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 0,
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/papers/validator.ts
git commit -m "fix: align validator LEVEL_SLOTS/LEVEL_HINTS with actual question bank"
```

---

### Task 2: generator.ts LEVEL_GUIDE + 프롬프트 전면 개선

**Files:**
- Modify: `lib/papers/generator.ts:1-105`

- [ ] **Step 1: LEVEL_GUIDE 타입 및 데이터 업데이트**

LEVEL_GUIDE에 `distractors`, `distractorType` 필드 추가:

```typescript
type DistractorType = 'distortion' | 'pseudo-answer' | 'mixed'

const LEVEL_GUIDE: Record<number, {
  slots: number
  distractors: number
  distractorType: DistractorType
  hints: number
  passageLen: string
  style: string
}> = {
  1: { slots: 3, distractors: 1, distractorType: 'distortion', hints: 3, passageLen: '150~250자 (6~8문장)', style: '일상/기초 인과. 짧고 명확한 문장.' },
  2: { slots: 3, distractors: 1, distractorType: 'distortion', hints: 3, passageLen: '200~300자 (6~8문장)', style: '부분 추상 개념 포함. 약간의 학술 용어.' },
  3: { slots: 4, distractors: 1, distractorType: 'distortion', hints: 3, passageLen: '300~450자 (최소 10문장)', style: '수식어/종속절 포함. 복합 문장 사용.' },
  4: { slots: 4, distractors: 1, distractorType: 'pseudo-answer', hints: 3, passageLen: '350~500자 (최소 10문장)', style: '모의고사 수준. 전문 용어와 복합 인과.' },
  5: { slots: 5, distractors: 1, distractorType: 'pseudo-answer', hints: 3, passageLen: '400~550자 (10~12문장)', style: '대조/역전 논리. 반례와 예외 포함.' },
  6: { slots: 5, distractors: 2, distractorType: 'mixed', hints: 3, passageLen: '500~700자 (12~15문장)', style: '수능 실전 수준. 다층적 논증 구조.' },
  7: { slots: 5, distractors: 2, distractorType: 'mixed', hints: 0, passageLen: '600~800자 (13~15문장)', style: '고난도 추상. 복잡한 논리 구조와 전문 개념.' },
}
```

- [ ] **Step 2: buildPrompt 함수 전면 재작성**

핵심 변경:
1. 오답 유형별 상세 지시 추가 (distortion / pseudo-answer / mixed)
2. 카드 id 셔플 지시: "정답 체인의 id가 알파벳순이 되지 않도록 카드 배치를 섞으세요"
3. 카드 텍스트 재구성 지시: "지문의 문장을 그대로 복사하지 말고, 동일 논리를 다른 표현으로"
4. 논문 기반 출제 지시 강화
5. 금지 패턴 명시: 극단적 한정어, 상식만으로 제거 가능한 오답

프롬프트 전문:

```typescript
function buildDistractorInstruction(type: DistractorType, count: number): string {
  const base = `- 오답 카드 ${count}장을 다음 규칙에 따라 만드세요.\n`

  const rules: Record<DistractorType, string> = {
    distortion: `${base}### 오답 유형: 왜곡형
- 지문에 등장하는 개념과 용어를 사용하되, 인과관계를 왜곡하세요.
- 허용되는 왜곡 기법:
  (1) 원인과 결과를 뒤바꿈
  (2) 필요조건을 충분조건으로 바꿈
  (3) 상관관계를 인과관계로 전환
  (4) 지문의 논리를 과잉 일반화하거나 축소
- 오답 카드는 정답 카드와 텍스트 길이, 문체가 유사해야 합니다.`,

    'pseudo-answer': `${base}### 오답 유형: 유사 정답형
- 정답 체인의 특정 단계와 비슷하지만 인과 경로가 미묘하게 다른 진술을 만드세요.
- 이 카드를 정답 체인에 넣으면 논리가 깨지지만, 얼핏 보면 들어맞는 것처럼 보여야 합니다.
- 정답 카드와 텍스트 길이, 문체가 반드시 동일해야 합니다.
- 오답이 끼어들 수 있는 위치가 명확해야 합니다 (어떤 정답 카드를 대체하는 것처럼 보이는지).`,

    mixed: `${base}### 오답 유형: 혼합 (왜곡형 1개 + 유사 정답형 1개)
- 왜곡형 1장: 지문의 개념을 사용하되 인과관계를 왜곡한 카드.
- 유사 정답형 1장: 정답 체인의 특정 단계와 비슷하지만 인과 경로가 다른 카드.
- 두 오답 카드 모두 정답 카드와 텍스트 길이, 문체가 동일해야 합니다.
- 유사 정답형은 체인의 서로 다른 위치에 끼어들 수 있어야 합니다.`,
  }

  return rules[type] + `

### 오답 금지 사항 (절대 위반 금지)
- "반드시", "완전히", "모든", "~만이", "전혀", "항상", "절대" 등 극단적 한정어 사용 금지.
- 지문 내용과 정반대인 내용만으로 구성된 오답 금지.
- 상식만으로 제거 가능한 오답 금지.
- 지문을 읽지 않고는 오답 여부를 판단할 수 없어야 합니다.`
}

function buildPrompt(text: string, level: number, topic: Topic, count: number): string {
  const config = LEVEL_GUIDE[level] ?? LEVEL_GUIDE[3]
  const { slots, distractors, distractorType, hints, passageLen, style } = config
  const totalCards = slots + distractors

  const sourceInstruction = text.length > 0
    ? `아래 논문/텍스트를 읽고, 핵심 논증 구조를 추출하여 수능 비문학 스타일의 인과 관계 추론 문제를 ${count}개 만들어주세요. 지문은 원문을 그대로 옮기지 말고 한국어로 재구성하세요.`
    : `"${topic}" 주제로 수능 비문학 스타일의 인과 관계 추론 문제를 ${count}개 만들어주세요. 지문도 직접 작성하세요.`

  const distractorInst = buildDistractorInstruction(distractorType, distractors)

  return `당신은 수능 비문학 추론 문제 전문 출제자입니다.

${sourceInstruction}

## 이 문제의 설정
- 레벨: ${level}
- 주제: ${topic}
- 지문 길이: ${passageLen}
- 스타일: ${style}
- 정답 카드: ${slots}장
- 오답 카드: ${distractors}장 (총 ${totalCards}장)
- 힌트: ${hints}개${hints === 0 ? ' (빈 배열)' : ''}

## 핵심 규칙

### passage (지문)
- ${text.length > 0 ? '원문(논문)에서 핵심 논증 구조를 추출하여 수능 비문학 스타일의 한국어 지문으로 재구성.' : '주제에 맞는 학술적 지문을 직접 작성.'}
- 반드시 ${passageLen} 범위로 작성.
- 레벨이 높을수록 복합 문장, 전문 용어, 다층 논증을 사용.

### conclusion (결론) — 중요
- 결론은 지문에 직접 등장하지 않는 문장이어야 합니다.
- 지문의 내용을 종합하여 논리적으로 추론할 수 있는 명제를 작성하세요.
- 지문의 문장을 그대로 복사하거나 요약하는 것은 금지합니다.

### sentences (보기 카드) — 핵심 변경사항 주의
- 정답 카드 ${slots}장: 각 카드는 인과 관계의 한 단계. 올바른 순서로 배열하면 결론에 도달.
${distractorInst}

### 카드 배치 규칙 — 중요
1. **id 셔플**: 카드의 id(a, b, c, ...)가 정답 체인 순서와 일치하지 않도록 배치하세요.
   - 나쁜 예: correct_chain이 ["a", "b", "c", "d"] (알파벳순 = 정답순)
   - 좋은 예: correct_chain이 ["c", "a", "d", "b"] (알파벳순 ≠ 정답순)
   - 오답 카드의 id도 정답 카드 사이에 섞어 배치하세요.
2. **텍스트 재구성**: 카드 텍스트는 지문의 문장을 그대로 복사하지 마세요. 동일한 논리적 내용을 다른 표현으로 재구성하세요.

### correct_chain (정답 순서)
- 정답 카드의 id를 인과 순서대로 배열. 반드시 ${slots}개.

### hints (힌트)
${hints > 0 ? `- ${hints}개 작성. level 1이 가장 추상적 힌트, 숫자가 클수록 구체적.` : '- 이 레벨은 힌트 없음 — hints를 빈 배열 []로.'}

## 출력 형식
반드시 JSON 배열만 출력하세요. 마크다운이나 설명 없이 순수 JSON만.

[
  {
    "difficulty_level": ${level},
    "topic": "${topic}",
    "passage": "...",
    "sentences": [
      {"id": "a", "text": "..."},
      {"id": "b", "text": "..."}
    ],
    "conclusion": "지문에 없지만 추론 가능한 명제",
    "correct_chain": ["c", "a", "d", "b"${slots > 4 ? ', ...' : ''}],
    "hints": [${hints > 0 ? '{"level": 1, "text": "..."}, ...' : ''}]
  }
]
${text.length > 0 ? `\n## 입력 텍스트\n${text.slice(0, 15000)}` : ''}`
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/papers/generator.ts
git commit -m "feat: enhance generator prompt with distractor types, id shuffle, text rewriting rules"
```

---

## Chunk 2: 문제 뱅크 L1~L2 (16문제)

### Task 3: question-bank-l1-l2.ts 전체 재작성

**Files:**
- Rewrite: `lib/questions/question-bank-l1-l2.ts`

설계 규칙:
- L1: 8문제, 3슬롯, 오답 1개(왜곡형), 힌트 3개, 6~8문장
- L2: 8문제, 3슬롯, 오답 1개(왜곡형), 힌트 3개, 6~8문장
- 소재: 교과서 20% + 신선한 소재 80%
- 카드 id는 정답 순서와 불일치하도록 셔플
- 카드 텍스트는 지문과 다른 표현으로 재구성
- 오답: 극단적 한정어 금지, 인과관계 왜곡 기법 사용

주제 배분 (각 레벨 8문제):
- L1: humanities×2, social×2, science×1, tech×1, arts×2
- L2: humanities×1, social×2, science×2, tech×2, arts×1
(정확한 균등 불필요, 골고루 분포)

- [ ] **Step 1: L1 문제 8개 작성**
- [ ] **Step 2: L2 문제 8개 작성**
- [ ] **Step 3: 파일 작성 및 빌드 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/questions/question-bank-l1-l2.ts
git commit -m "feat: rewrite L1-L2 question bank with improved distractors and shuffled ids"
```

---

## Chunk 3: 문제 뱅크 L3~L4 (18문제)

### Task 4: question-bank-l3-l4.ts 전체 재작성

**Files:**
- Rewrite: `lib/questions/question-bank-l3-l4.ts`

설계 규칙:
- L3: 8문제, 4슬롯, 오답 1개(왜곡형), 힌트 3개, 최소 10문장
- L4: 10문제, 4슬롯, 오답 1개(유사 정답형), 힌트 3개, 최소 10문장
- L4의 오답은 정답 체인의 특정 단계를 대체할 수 있는 것처럼 보여야 함

주제 배분:
- L3: humanities×2, social×2, science×1, tech×1, arts×2
- L4: humanities×2, social×2, science×2, tech×2, arts×2

- [ ] **Step 1: L3 문제 8개 작성**
- [ ] **Step 2: L4 문제 10개 작성**
- [ ] **Step 3: 파일 작성 및 빌드 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/questions/question-bank-l3-l4.ts
git commit -m "feat: rewrite L3-L4 question bank with distortion and pseudo-answer distractors"
```

---

## Chunk 4: 문제 뱅크 L5~L7 (34문제)

### Task 5: question-bank-l5-l7.ts 전체 재작성

**Files:**
- Rewrite: `lib/questions/question-bank-l5-l7.ts`

설계 규칙:
- L5: 10문제, 5슬롯, 오답 1개(유사 정답형), 힌트 3개, 10~12문장
- L6: 12문제, 5슬롯, 오답 2개(혼합), 힌트 3개, 12~15문장
- L7: 12문제, 5슬롯, 오답 2개(혼합), 힌트 없음, 13~15문장

주제 배분:
- L5: humanities×2, social×2, science×2, tech×2, arts×2
- L6: humanities×2, social×3, science×2, tech×3, arts×2
- L7: humanities×2, social×3, science×3, tech×2, arts×2

- [ ] **Step 1: L5 문제 10개 작성**
- [ ] **Step 2: L6 문제 12개 작성**
- [ ] **Step 3: L7 문제 12개 작성**
- [ ] **Step 4: 파일 작성 및 빌드 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add lib/questions/question-bank-l5-l7.ts
git commit -m "feat: rewrite L5-L7 question bank with advanced distractors and longer passages"
```

---

## Chunk 5: 최종 검증 및 정리

### Task 6: CLAUDE.md 레벨 설정 동기화

**Files:**
- Modify: `CLAUDE.md` (레벨별 난이도 기준 표)

현재 CLAUDE.md의 레벨 기준표가 실제 구현과 불일치 (L6: 6슬롯→5슬롯, L7: 7슬롯→5슬롯 등). 동기화.

- [ ] **Step 1: 레벨별 난이도 기준 표 업데이트**

```markdown
| 레벨 | 슬롯 수 | 오답 수 | 오답 유형 | 힌트 | 지문 길이 |
|------|---------|---------|-----------|------|----------|
| 1 | 3 | 1 | 왜곡형 | 직접 | 6~8문장 |
| 2 | 3 | 1 | 왜곡형 | 직접 | 6~8문장 |
| 3 | 4 | 1 | 왜곡형 | 반직접 | 10문장+ |
| 4 | 4 | 1 | 유사 정답형 | 반직접 | 10문장+ |
| 5 | 5 | 1 | 유사 정답형 | 간접 | 10~12문장 |
| 6 | 5 | 2 | 혼합 | 간접 | 12~15문장 |
| 7 | 5 | 2 | 혼합 | 없음 | 13~15문장 |
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: sync level config table with renewed question bank"
```

### Task 7: 전체 빌드 및 최종 확인

- [ ] **Step 1: 전체 빌드**

```bash
npm run build
```

- [ ] **Step 2: 문제 수 확인**

각 레벨별 문제 수가 설계와 일치하는지 확인:
L1:8, L2:8, L3:8, L4:10, L5:10, L6:12, L7:12 = 총 68문제

- [ ] **Step 3: 최종 Commit (필요시)**

```bash
git add -A
git commit -m "chore: final build verification for question bank renewal"
```
