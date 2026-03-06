import PageTransition from '@/components/layout/PageTransition'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
