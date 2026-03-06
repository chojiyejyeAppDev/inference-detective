import PageTransition from '@/components/layout/PageTransition'

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
