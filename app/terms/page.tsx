import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Footer from '@/components/common/Footer'

export const metadata = {
  title: '이용약관 — 이:르다',
}

export default function TermsPage() {
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

        <h1 className="text-3xl font-black text-white tracking-tight mb-2">이용약관</h1>
        <p className="text-sm text-slate-600 mb-10">시행일: 2026년 3월 1일</p>

        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-3">제1조 (목적)</h2>
            <p>
              이 약관은 이온랩(이하 &quot;회사&quot;)이 제공하는 &quot;이:르다&quot; 서비스(이하 &quot;서비스&quot;)의
              이용 조건 및 절차, 회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제2조 (서비스의 내용)</h2>
            <p className="mb-3">
              서비스는 수능 비문학 추론 능력 훈련을 위한 웹 기반 학습 플랫폼으로, 다음의 기능을 제공합니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>드래그&드롭 방식의 추론 경로 조립 학습</li>
              <li>7단계 난이도별 문제 풀이</li>
              <li>단계별 힌트 시스템</li>
              <li>성장 대시보드 및 오답 분석 (프리미엄)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제3조 (서비스 제공 기간)</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong className="text-slate-300">무료 회원:</strong> 회원 탈퇴 시까지 (일일 5문제 제한)</li>
              <li><strong className="text-slate-300">월간 구독:</strong> 결제일로부터 30일</li>
              <li><strong className="text-slate-300">연간 구독:</strong> 결제일로부터 365일</li>
              <li><strong className="text-slate-300">학생 구독:</strong> 결제일로부터 30일</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제4조 (회원가입 및 계정)</h2>
            <p>
              회원가입은 이메일 또는 Google 계정을 통해 가능하며, 가입 시 본 약관 및 개인정보처리방침에
              동의한 것으로 간주합니다. 회원은 정확한 정보를 제공해야 하며, 타인의 정보를 도용하여
              가입할 수 없습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제5조 (이용 요금)</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>월간 구독: 9,900원/월</li>
              <li>연간 구독: 79,200원/년</li>
              <li>학생 구독: 6,900원/월</li>
            </ul>
            <p className="mt-3">
              요금은 사전 고지 후 변경될 수 있으며, 변경된 요금은 다음 결제 주기부터 적용됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제6조 (회원의 의무)</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>서비스를 부정한 목적으로 이용하지 않아야 합니다.</li>
              <li>문제 및 콘텐츠를 무단으로 복제·배포할 수 없습니다.</li>
              <li>타인의 학습을 방해하는 행위를 해서는 안 됩니다.</li>
              <li>계정을 타인에게 양도하거나 공유할 수 없습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제7조 (서비스 변경 및 중단)</h2>
            <p>
              회사는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.
              서비스 중단 시 회사는 사전에 공지하며, 유료 회원에게는 잔여 기간에 대한 환불을 진행합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제8조 (환불 및 해지)</h2>
            <p>
              구독 해지 및 환불에 관한 자세한 사항은{' '}
              <Link href="/refund" className="text-amber-400 hover:text-amber-300 underline transition-colors">
                환불규정
              </Link>
              을 참고하시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제9조 (면책조항)</h2>
            <p>
              회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인하여 서비스를
              제공할 수 없는 경우 책임이 면제됩니다. 회사는 회원의 귀책사유로 인한 서비스 이용 장애에
              대하여 책임을 지지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제10조 (분쟁 해결)</h2>
            <p>
              서비스 이용과 관련하여 분쟁이 발생한 경우, 회사와 회원은 상호 협의하여 해결하도록
              노력합니다. 협의가 이루어지지 않는 경우, 관할 법원은 회사 소재지를 관할하는 법원으로 합니다.
            </p>
          </section>

          <section className="border-t border-white/[0.06] pt-8">
            <p className="text-slate-600">
              본 약관에 대한 문의사항은{' '}
              <a href="mailto:eonlab@2onlab.com" className="text-amber-400 hover:text-amber-300 transition-colors">
                eonlab@2onlab.com
              </a>
              으로 연락해 주세요.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}
