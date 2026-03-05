import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0C1628]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* 상단: 로고 + 정책 링크 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-amber-500/80 flex items-center justify-center">
              <span className="text-slate-900 font-black text-[9px]">르</span>
            </div>
            <span className="text-sm font-bold text-slate-400">이:르다</span>
          </div>
          <div className="flex gap-5 text-xs">
            <Link href="/terms" className="text-slate-500 hover:text-slate-300 transition-colors">
              이용약관
            </Link>
            <Link href="/privacy" className="text-slate-500 hover:text-slate-300 transition-colors">
              개인정보처리방침
            </Link>
            <Link href="/refund" className="text-slate-500 hover:text-slate-300 transition-colors">
              환불규정
            </Link>
          </div>
        </div>

        {/* 사업자 정보 */}
        <div className="text-[11px] leading-relaxed text-slate-600 space-y-1">
          <p>
            <span className="text-slate-500">이온랩</span>
            <span className="mx-1.5">|</span>대표자: 조지예
            <span className="mx-1.5">|</span>사업자등록번호: 263-54-01020
          </p>
          <p>
            통신판매업신고: 제2026-충북청주-0103호
          </p>
          <p>
            주소: 충청북도 청주시 서원구 내수동로108번길 33, 4층
          </p>
          <p>
            전화: 043-260-2520
            <span className="mx-1.5">|</span>이메일:{' '}
            <a href="mailto:eonlab@2onlab.com" className="hover:text-slate-400 transition-colors">
              eonlab@2onlab.com
            </a>
          </p>
        </div>

        {/* 저작권 */}
        <div className="mt-6 pt-5 border-t border-white/[0.04]">
          <p className="text-[11px] text-slate-700">
            &copy; {new Date().getFullYear()} 이온랩. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
