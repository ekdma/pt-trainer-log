import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "설문 결과 | Survey Result",
  description: "개인 설문 결과를 확인하고 피트니스 계획에 활용하세요. / View your survey results and use them to guide your fitness plan.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
