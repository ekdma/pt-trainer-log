import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "내 일정 | My Schedule",
  description: "개인 일정과 예약을 관리하고 알림을 받아보세요. / Manage personal schedules and reservations with notifications.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
