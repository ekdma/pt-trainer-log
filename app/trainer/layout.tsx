import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "트레이너 공간 | Trainer Dashboard",
  description: "회원 관리, 상담 기록, 세션 일정을 효율적으로 확인하고 관리하세요. / Efficiently manage members, counseling records, and session schedules.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
