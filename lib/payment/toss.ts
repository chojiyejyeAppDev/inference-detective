const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!
const TOSS_API_BASE = 'https://api.tosspayments.com/v1'

const authHeader = {
  Authorization: `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
  'Content-Type': 'application/json',
}

export async function issueBillingKey(
  authKey: string,
  customerKey: string,
): Promise<{ billingKey: string; customerKey: string }> {
  const res = await fetch(`${TOSS_API_BASE}/billing/authorizations/issue`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ authKey, customerKey }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message ?? 'Billing key issuance failed')
  }

  return res.json()
}

export async function chargeBilling(params: {
  billingKey: string
  customerKey: string
  orderId: string
  orderName: string
  amount: number
  customerEmail: string
  customerName: string
}): Promise<{ paymentKey: string; status: string }> {
  const res = await fetch(
    `${TOSS_API_BASE}/billing/${params.billingKey}`,
    {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        customerKey: params.customerKey,
        amount: params.amount,
        orderId: params.orderId,
        orderName: params.orderName,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message ?? 'Billing charge failed')
  }

  return res.json()
}

export const PLANS = {
  monthly: { name: '월간 구독', amount: 9900 },
  yearly: { name: '연간 구독', amount: 79200 },
  student: { name: '학생 구독', amount: 6900 },
} as const

export type PlanKey = keyof typeof PLANS
