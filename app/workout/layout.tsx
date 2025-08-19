import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "운동 기록 | Workout Log",
  description: "운동 세트, 중량을 기록하고 진행 상황을 추적하세요. / Track sets and weights to monitor your workout progress.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
