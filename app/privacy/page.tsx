import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Footer from '@/components/common/Footer'

export const metadata = {
  title: '개인정보처리방침 — 이:르다',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-base text-slate-300">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          홈으로
        </Link>

        <h1 className="text-3xl font-black text-white tracking-tight mb-2">개인정보처리방침</h1>
        <p className="text-sm text-slate-500 mb-10">시행일: 2026년 3월 1일</p>

        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <p>
              이온랩(이하 &quot;회사&quot;)은 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고,
              이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보처리방침을
              수립·공개합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제1조 (수집하는 개인정보)</h2>
            <p className="mb-3">회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.</p>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-400 mb-1">필수 수집 항목</p>
                <p className="text-slate-400">이메일 주소, 비밀번호(암호화), 닉네임</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 mb-1">Google OAuth 로그인 시</p>
                <p className="text-slate-400">이메일 주소, 프로필 이름</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 mb-1">결제 시</p>
                <p className="text-slate-400">결제 정보(구독 시 카드 빌링키 포함 — PortOne을 통해 암호화 처리)</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 mb-1">자동 수집 항목</p>
                <p className="text-slate-400">서비스 이용 기록, 접속 로그, 기기 정보</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제2조 (수집 및 이용 목적)</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>회원 가입 및 본인 확인</li>
              <li>서비스 제공 및 학습 이력 관리</li>
              <li>구독 결제 및 환불 처리</li>
              <li>서비스 개선 및 신규 기능 개발</li>
              <li>고객 문의 대응</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제3조 (보유 및 이용 기간)</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong className="text-slate-300">회원 정보:</strong> 회원 탈퇴 시까지 (탈퇴 후 즉시 파기)</li>
              <li><strong className="text-slate-300">결제 기록:</strong> 전자상거래법에 따라 5년 보관</li>
              <li><strong className="text-slate-300">접속 로그:</strong> 통신비밀보호법에 따라 3개월 보관</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제4조 (제3자 제공)</h2>
            <p className="mb-3">
              회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우 예외로 합니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법률에 특별한 규정이 있는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제5조 (처리 위탁)</h2>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs">
                    <th className="text-left pb-2 font-medium">수탁업체</th>
                    <th className="text-left pb-2 font-medium">위탁 업무</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400">
                  <tr className="border-t border-white/[0.04]">
                    <td className="py-2">Supabase Inc.</td>
                    <td className="py-2">데이터베이스 호스팅 및 인증 처리</td>
                  </tr>
                  <tr className="border-t border-white/[0.04]">
                    <td className="py-2">포트원(PortOne)</td>
                    <td className="py-2">결제 처리 및 결제 정보 관리</td>
                  </tr>
                  <tr className="border-t border-white/[0.04]">
                    <td className="py-2">Vercel Inc.</td>
                    <td className="py-2">웹 서비스 호스팅</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제6조 (개인정보의 파기)</h2>
            <p>
              회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는
              지체 없이 해당 개인정보를 파기합니다. 전자적 파일 형태의 정보는 복구할 수 없는 방법으로
              영구 삭제하며, 종이 문서는 분쇄기로 분쇄하거나 소각합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제7조 (이용자의 권리)</h2>
            <p>이용자는 다음의 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 mt-2">
              <li>개인정보 열람 요구</li>
              <li>개인정보 정정·삭제 요구</li>
              <li>개인정보 처리 정지 요구</li>
              <li>회원 탈퇴</li>
            </ul>
            <p className="mt-3">
              위 권리 행사는 서비스 내 설정 또는 이메일(eonlab@2onlab.com)을 통해 가능합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">제8조 (개인정보 보호책임자)</h2>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-slate-400">
              <p>성명: 조지예</p>
              <p>직위: 대표</p>
              <p>이메일: eonlab@2onlab.com</p>
              <p>전화: 043-260-2520</p>
            </div>
          </section>

          <section className="border-t border-white/[0.06] pt-8">
            <p className="text-slate-500">
              본 방침에 대한 문의사항은{' '}
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
