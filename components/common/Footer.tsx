import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-exam-rule bg-bg-base">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* 상단: 로고 + 정책 링크 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-8">
          <div className="flex items-center gap-2">
            <span className="font-exam-serif text-sm font-bold text-exam-ink">이:르다</span>
          </div>
          <div className="flex gap-5 text-xs">
            <Link href="/terms" className="text-stone-400 hover:text-exam-ink transition-colors">
              이용약관
            </Link>
            <Link href="/privacy" className="text-stone-400 hover:text-exam-ink transition-colors">
              개인정보처리방침
            </Link>
            <Link href="/refund" className="text-stone-400 hover:text-exam-ink transition-colors">
              환불규정
            </Link>
          </div>
        </div>

        {/* 사업자 정보 */}
        <address className="text-[11px] leading-relaxed text-stone-400 space-y-1 not-italic">
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 sm:flex sm:flex-wrap sm:gap-x-0 sm:gap-y-1">
            <div className="contents sm:flex sm:items-center">
              <dt className="sr-only">상호</dt>
              <dd>이온랩</dd>
              <span className="hidden sm:inline mx-1.5" aria-hidden="true">|</span>
            </div>
            <div className="contents sm:flex sm:items-center">
              <dt className="sr-only">대표자</dt>
              <dd>대표자: 조지예</dd>
              <span className="hidden sm:inline mx-1.5" aria-hidden="true">|</span>
            </div>
            <div className="contents sm:flex sm:items-center">
              <dt className="sr-only">사업자등록번호</dt>
              <dd>사업자등록번호: 263-54-01020</dd>
            </div>
          </dl>
          <p>통신판매업신고: 제2026-충북청주-0103호</p>
          <p>주소: 충청북도 청주시 서원구 내수동로108번길 33, 4층</p>
          <p>
            전화: <a href="tel:043-260-2520" className="hover:text-exam-ink transition-colors">043-260-2520</a>
            <span className="mx-1.5" aria-hidden="true">|</span>
            이메일:{' '}
            <a href="mailto:eonlab@2onlab.com" className="hover:text-exam-ink transition-colors">
              eonlab@2onlab.com
            </a>
          </p>
        </address>

        {/* 저작권 */}
        <div className="mt-6 pt-5 border-t border-exam-rule">
          <p className="text-[11px] text-stone-400">
            &copy; {new Date().getFullYear()} 이온랩. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
