import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "비포 & 애프터 | Before & After",
  description: "체형 변화를 기록하고 이전과 비교하여 성과를 확인하세요. / Record body transformations and compare to see your progress.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
