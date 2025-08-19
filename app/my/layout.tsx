// app/my/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "내 공간 | My Page",
  description: "공복체중, 목표, 개인 일정을 한눈에 확인하고 관리하세요. / Track fasting weight, set goals, and manage your personal schedule all in one place.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
