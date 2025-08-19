import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "설문 응답 | Survey Response",
  description: "설문 응답을 제출하고 이전 결과를 확인하세요. / Submit your survey responses and review your previous results.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
