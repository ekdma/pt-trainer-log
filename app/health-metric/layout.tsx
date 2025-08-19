import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "건강 지표 | Health Metrics",
  description: "체중, 체지방률, 근육량 등 건강 데이터를 기록하고 분석하세요. / Record and analyze weight, body fat, muscle mass, and other health metrics.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
