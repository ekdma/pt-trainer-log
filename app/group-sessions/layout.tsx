import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "그룹 세션 | Group Sessions",
  description: "그룹 운동 수업을 확인하고 등록하세요. / View and register group workout sessions.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
