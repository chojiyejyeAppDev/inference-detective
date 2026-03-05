const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET!
const PORTONE_API_BASE = 'https://api.portone.io'

function getAuthHeaders(): Record<string, string> {
  return {
    Authorization: `PortOne ${PORTONE_API_SECRET}`,
    'Content-Type': 'application/json',
  }
}

// ──────────────────────────────────────────────────
// 빌링키로 결제 실행
// ──────────────────────────────────────────────────
export async function chargeBillingKey(params: {
  billingKey: string
  paymentId: string
  orderName: string
  amount: number
  currency?: string
  customer?: { id?: string; name?: string; email?: string }
}): Promise<{ paymentId: string }> {
  const res = await fetch(
    `${PORTONE_API_BASE}/payments/${encodeURIComponent(params.paymentId)}/billing-key`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        billingKey: params.billingKey,
        orderName: params.orderName,
        amount: { total: params.amount },
        currency: params.currency ?? 'KRW',
        customer: params.customer,
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error(err.message ?? 'Billing key charge failed')
  }

  return res.json()
}

// ──────────────────────────────────────────────────
// 빌링키 삭제 (구독 취소 시)
// ──────────────────────────────────────────────────
export async function deleteBillingKey(billingKey: string): Promise<void> {
  const res = await fetch(
    `${PORTONE_API_BASE}/billing-keys/${encodeURIComponent(billingKey)}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error(err.message ?? 'Billing key deletion failed')
  }
}

// ──────────────────────────────────────────────────
// 결제 조회 (웹훅 검증용)
// ──────────────────────────────────────────────────
interface PortOnePayment {
  id: string
  status: string
  amount: { total: number }
}

export async function getPayment(paymentId: string): Promise<PortOnePayment> {
  const res = await fetch(
    `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`,
    { headers: getAuthHeaders() },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error(err.message ?? 'Payment query failed')
  }

  return res.json()
}

// ──────────────────────────────────────────────────
// 구독 플랜
// ──────────────────────────────────────────────────
export const PLANS = {
  monthly: { name: '월간 구독', amount: 9900 },
  yearly: { name: '연간 구독', amount: 79200 },
  student: { name: '학생 구독', amount: 6900 },
} as const

export type PlanKey = keyof typeof PLANS
