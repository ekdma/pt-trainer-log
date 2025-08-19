import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "설문조사 | Survey",
  description: "맞춤형 피트니스 설문을 작성하여 개인 맞춤 계획을 세우세요. / Complete personalized fitness surveys to create your tailored plan.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
