import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "식단 일지 | Food Diary",
  description: "하루 식단을 기록하고 건강한 식습관을 관리하세요. / Record daily meals and manage your healthy eating habits.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
