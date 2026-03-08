export type PaymentMethodKey = 'card' | 'kakaopay'

export interface PaymentChannel {
  key: PaymentMethodKey
  label: string
  description: string
  channelKey: string
  /** 일회성 결제 전용 채널키. 없으면 channelKey 사용 */
  onetimeChannelKey?: string
  billingKeyMethod: 'CARD' | 'EASY_PAY'
  payMethod: 'CARD' | 'EASY_PAY'
  requiresPhone: boolean
  /** 빌링키(정기결제) 지원 여부. false면 일회성 결제만 가능 */
  supportsBillingKey: boolean
}

export const PAYMENT_CHANNELS: Record<PaymentMethodKey, PaymentChannel> = {
  card: {
    key: 'card',
    label: '신용/체크카드',
    description: 'KG이니시스',
    channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_INICIS!,
    billingKeyMethod: 'CARD',
    payMethod: 'CARD',
    requiresPhone: true,
    supportsBillingKey: true,
  },
  kakaopay: {
    key: 'kakaopay',
    label: '카카오페이',
    description: '간편결제',
    channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY!,
    onetimeChannelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY_ONETIME!,
    billingKeyMethod: 'EASY_PAY',
    payMethod: 'EASY_PAY',
    requiresPhone: false,
    supportsBillingKey: true,
  },
}

export const PAYMENT_METHOD_ORDER: PaymentMethodKey[] = ['card', 'kakaopay']
export const DEFAULT_PAYMENT_METHOD: PaymentMethodKey = 'card'
