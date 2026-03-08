// ── 공통 레이아웃 ──
function layout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <!-- 로고 -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:12px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;font-size:24px;font-weight:700;">르</span>
      <p style="color:#f59e0b;font-size:18px;font-weight:700;margin:8px 0 0;">이:르다</p>
    </div>

    <!-- 콘텐츠 -->
    <div style="background:#1e293b;border-radius:16px;padding:32px 24px;border:1px solid #334155;">
      ${content}
    </div>

    <!-- 푸터 -->
    <div style="text-align:center;margin-top:24px;color:#64748b;font-size:12px;">
      <p style="margin:0;">이:르다 — 수능 비문학 추론 훈련</p>
      <p style="margin:4px 0 0;">이온랩 (EonLab) | eonlab.official@gmail.com</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// ── 회원가입 환영 ──
export function welcomeEmail(nickname: string): { subject: string; html: string } {
  return {
    subject: '🎓 이:르다에 오신 것을 환영합니다!',
    html: layout(`
      <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 16px;">환영합니다, ${nickname}님! 🎉</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 16px;">
        이:르다에서 수능 비문학 추론 능력을 체계적으로 훈련해보세요.
        드래그&드롭으로 추론 경로를 조립하며 7단계 레벨을 정복해나갈 수 있습니다.
      </p>
      <div style="background:#0f172a;border-radius:12px;padding:16px;margin:16px 0;">
        <p style="color:#f59e0b;font-size:13px;font-weight:600;margin:0 0 8px;">🚀 시작하기</p>
        <p style="color:#cbd5e1;font-size:13px;margin:0;">• 매일 무료 5문제 풀기</p>
        <p style="color:#cbd5e1;font-size:13px;margin:4px 0 0;">• 힌트 시스템으로 단계별 학습</p>
        <p style="color:#cbd5e1;font-size:13px;margin:4px 0 0;">• 레벨 1부터 차근차근 도전</p>
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="https://inference-detective.vercel.app/levels"
           style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;font-weight:700;font-size:14px;padding:12px 32px;border-radius:10px;text-decoration:none;">
          지금 시작하기 →
        </a>
      </div>
    `),
  }
}

// ── 초대 성공 알림 (초대자에게) ──
export function inviteSuccessToInviter(
  inviterNickname: string,
  inviteeNickname: string,
  bonusQuestions: number,
): { subject: string; html: string } {
  return {
    subject: `🎁 ${inviteeNickname}님이 초대 코드를 사용했어요!`,
    html: layout(`
      <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 16px;">초대 성공! 🎁</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 16px;">
        ${inviterNickname}님, <strong style="color:#f59e0b;">${inviteeNickname}</strong>님이
        초대 코드를 사용하여 이:르다에 가입했습니다!
      </p>
      <div style="background:#0f172a;border-radius:12px;padding:16px;text-align:center;">
        <p style="color:#f59e0b;font-size:28px;font-weight:700;margin:0;">+${bonusQuestions}문제</p>
        <p style="color:#94a3b8;font-size:13px;margin:8px 0 0;">오늘의 보너스 문제가 추가되었어요!</p>
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="https://inference-detective.vercel.app/levels"
           style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;font-weight:700;font-size:14px;padding:12px 32px;border-radius:10px;text-decoration:none;">
          보너스 문제 풀기 →
        </a>
      </div>
    `),
  }
}

// ── 초대 보너스 알림 (가입자에게) ──
export function inviteSuccessToInvitee(
  inviteeNickname: string,
  bonusQuestions: number,
): { subject: string; html: string } {
  return {
    subject: `🎁 초대 보너스 ${bonusQuestions}문제가 지급되었어요!`,
    html: layout(`
      <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 16px;">초대 보너스 지급! 🎁</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 16px;">
        ${inviteeNickname}님, 초대 코드를 사용해주셔서 감사합니다!
      </p>
      <div style="background:#0f172a;border-radius:12px;padding:16px;text-align:center;">
        <p style="color:#f59e0b;font-size:28px;font-weight:700;margin:0;">+${bonusQuestions}문제</p>
        <p style="color:#94a3b8;font-size:13px;margin:8px 0 0;">오늘의 보너스 문제가 추가되었어요!</p>
      </div>
    `),
  }
}

// ── 데일리 리마인더 ──
export function dailyReminderEmail(nickname: string): string {
  return layout(`
    <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 16px;">오늘의 추론 문제가 준비됐어요!</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 16px;">
      ${nickname}님, 매일 5문제씩 꾸준히 풀면 추론력이 확실히 달라져요.
      오늘도 짧은 시간 투자로 비문학 실력을 키워보세요.
    </p>
    <div style="background:#0f172a;border-radius:12px;padding:16px;text-align:center;">
      <p style="color:#f59e0b;font-size:32px;font-weight:700;margin:0;">5</p>
      <p style="color:#94a3b8;font-size:13px;margin:4px 0 0;">오늘의 무료 문제</p>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <a href="https://eruda.today/levels"
         style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;font-weight:700;font-size:14px;padding:12px 32px;border-radius:10px;text-decoration:none;">
        지금 풀러 가기 →
      </a>
    </div>
    <p style="color:#475569;font-size:11px;margin:16px 0 0;text-align:center;">
      이 메일을 원하지 않으시면 eonlab.official@gmail.com으로 수신 거부를 요청해주세요.
    </p>
  `)
}

// ── 구독 결제 완료 ──
export function subscriptionConfirmEmail(
  nickname: string,
  planName: string,
  expiresAt: string,
): { subject: string; html: string } {
  const formattedDate = new Date(expiresAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return {
    subject: `✨ 프리미엄 구독이 시작되었습니다!`,
    html: layout(`
      <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 16px;">프리미엄 구독 완료! ✨</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 16px;">
        ${nickname}님, 프리미엄 구독을 시작해주셔서 감사합니다!
        이제 무제한으로 문제를 풀 수 있습니다.
      </p>
      <div style="background:#0f172a;border-radius:12px;padding:16px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#64748b;font-size:13px;padding:6px 0;">플랜</td>
            <td style="color:#f59e0b;font-size:13px;font-weight:600;text-align:right;padding:6px 0;">${planName}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-size:13px;padding:6px 0;">만료일</td>
            <td style="color:#f1f5f9;font-size:13px;text-align:right;padding:6px 0;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-size:13px;padding:6px 0;">혜택</td>
            <td style="color:#10b981;font-size:13px;font-weight:600;text-align:right;padding:6px 0;">무제한 문제 풀기</td>
          </tr>
        </table>
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="https://inference-detective.vercel.app/dashboard"
           style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;font-weight:700;font-size:14px;padding:12px 32px;border-radius:10px;text-decoration:none;">
          대시보드 보기 →
        </a>
      </div>
    `),
  }
}
