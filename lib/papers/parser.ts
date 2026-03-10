import pdf from 'pdf-parse'

export interface ParseResult {
  text: string
  pageCount: number
}

export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  const data = await pdf(buffer)
  return {
    text: data.text.trim(),
    pageCount: data.numpages,
  }
}

/**
 * 긴 텍스트를 maxLen 이하의 청크로 분할.
 * 문단 경계(빈 줄)를 우선적으로 사용하여 자연스럽게 분할.
 */
export function chunkText(text: string, maxLen = 4000): string[] {
  if (text.length <= maxLen) return [text]

  const paragraphs = text.split(/\n\s*\n/)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxLen) {
      if (current.length > 0) {
        chunks.push(current.trim())
        current = ''
      }
      if (para.length > maxLen) {
        const sentences = para.split(/(?<=[.!?。])\s+/)
        for (const sentence of sentences) {
          if (current.length + sentence.length + 1 > maxLen) {
            if (current.length > 0) chunks.push(current.trim())
            current = sentence
          } else {
            current += (current ? ' ' : '') + sentence
          }
        }
      } else {
        current = para
      }
    } else {
      current += (current ? '\n\n' : '') + para
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim())
  }

  return chunks
}
