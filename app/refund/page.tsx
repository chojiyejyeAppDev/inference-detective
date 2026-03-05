import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Footer from '@/components/common/Footer'

export const metadata = {
  title: '환불규정 — 이:르다',
}

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-[#0C1628] text-slate-300">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          홈으로
        </Link>

        <h1 className="text-3xl font-black text-white tracking-tight mb-2">환불·교환·취소 규정</h1>
        <p className="text-sm text-slate-600 mb-10">시행일: 2026년 3월 1일</p>

        <div className="space-y-10 text-sm leading-relaxed">
          {/* 서비스 제공 기간 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">제1조 (서비스 제공 기간)</h2>
            <p className="mb-3">
              유료 구독 서비스는 결제 완료 시점부터 아래 기간 동안 제공됩니다.
            </p>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs">
                    <th className="text-left pb-2 font-medium">구독 플랜</th>
                    <th className="text-left pb-2 font-medium">금액</th>
                    <th className="text-left pb-2 font-medium">제공 기간</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400">
                  <tr className="border-t border-white/[0.04]">
                    <td className="py-2">월간 구독</td>
                    <td className="py-2">9,900원</td>
                    <td className="py-2">결제일로부터 30일</td>
                  </tr>
                  <tr className="border-t border-white/[0.04]">
                    <td className="py-2">연간 구독</td>
                    <td className="py-2">79,200원</td>
                    <td className="py-2">결제일로부터 365일</td>
                  </tr>
                  <tr className="border-t border-white/[0.04]">
                    <td className="py-2">학생 구독</td>
                    <td className="py-2">6,900원</td>
                    <td className="py-2">결제일로부터 30일</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 교환 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">제2조 (교환)</h2>
            <p>
              본 서비스는 디지털 콘텐츠 서비스로서 교환이 불가합니다.
              다른 구독 플랜으로 변경을 원하시는 경우, 현재 구독을 해지한 후 새로운 플랜으로
              재가입하시기 바랍니다.
            </p>
          </section>

          {/* 환불 정책 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">제3조 (환불 정책)</h2>

            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
                <p className="text-xs font-bold text-emerald-400 mb-2">전액 환불</p>
                <p className="text-slate-400">
                  결제일로부터 7일 이내에 서비스를 전혀 이용하지 않은 경우 전액 환불이 가능합니다.
                </p>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
                <p className="text-xs font-bold text-amber-400 mb-2">부분 환불</p>
                <p className="text-slate-400">
                  결제일로부터 7일 경과 또는 서비스 이용 이력이 있는 경우,
                  잔여 기간에 대해 일할 계산하여 환불합니다.
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  환불 금액 = 결제 금액 &times; (잔여일 / 전체 이용일) &minus; 결제 수수료
                </p>
              </div>

              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4">
                <p className="text-xs font-bold text-red-400 mb-2">환불 불가</p>
                <ul className="text-slate-400 space-y-1">
                  <li>- 구독 기간이 만료된 경우</li>
                  <li>- 회원의 귀책사유로 서비스 이용이 제한된 경우</li>
                  <li>- 이벤트·프로모션을 통해 무상으로 제공된 서비스</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 구독 취소 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">제4조 (구독 취소/해지)</h2>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-400 mb-1">해지 방법</p>
                <p className="text-slate-400">
                  서비스 내 설정 페이지에서 &quot;구독 해지&quot; 버튼을 클릭하여 해지할 수 있습니다.
                  또는 고객센터(eonlab@2onlab.com / 043-260-2520)로 연락하여 해지를 요청할 수 있습니다.
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 mb-1">해지 효력</p>
                <ul className="text-slate-400 space-y-1">
                  <li>- 해지 신청 즉시 다음 결제일부터 자동결제가 중단됩니다.</li>
                  <li>- 해지 후에도 현재 구독 기간 만료일까지 프리미엄 서비스를 이용할 수 있습니다.</li>
                  <li>- 만료 후에는 무료 회원으로 전환되어 일일 5문제 제한이 적용됩니다.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 환불 신청 방법 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">제5조 (환불 신청 방법)</h2>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2 text-slate-400">
              <p>
                <strong className="text-slate-300">이메일:</strong>{' '}
                <a href="mailto:eonlab@2onlab.com" className="text-amber-400 hover:text-amber-300 transition-colors">
                  eonlab@2onlab.com
                </a>
              </p>
              <p><strong className="text-slate-300">전화:</strong> 043-260-2520</p>
              <p className="text-xs text-slate-500 mt-2">
                환불 신청 시 회원 이메일, 결제일, 환불 사유를 함께 알려주세요.
                접수 후 영업일 기준 3일 이내에 처리됩니다.
              </p>
            </div>
          </section>

          {/* 청약철회 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">제6조 (청약철회)</h2>
            <p>
              「전자상거래 등에서의 소비자보호에 관한 법률」에 따라, 디지털 콘텐츠의 경우
              서비스 이용이 개시된 후에는 청약철회가 제한될 수 있습니다. 단, 서비스 내용이
              표시·광고 내용과 다르거나 계약 내용과 다르게 이행된 경우에는 서비스를 제공받은
              날로부터 3개월 이내, 그 사실을 안 날로부터 30일 이내에 청약철회가 가능합니다.
            </p>
          </section>

          <section className="border-t border-white/[0.06] pt-8">
            <p className="text-slate-600">
              환불 관련 문의:{' '}
              <a href="mailto:eonlab@2onlab.com" className="text-amber-400 hover:text-amber-300 transition-colors">
                eonlab@2onlab.com
              </a>
              {' '}/ 043-260-2520
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}
