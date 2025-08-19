import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "일정 | Schedule",
  description: "운동 일정을 쉽게 확인하고 계획하세요. / Easily view and plan your workout schedules.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
