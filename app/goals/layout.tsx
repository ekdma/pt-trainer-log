import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "목표 관리 | Goals",
  description: "개인 목표를 설정하세요. / Set personal goals.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
