import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "회원 상담 | Member Counseling",
  description: "회원 상담 기록을 관리하고 새 상담을 등록하여 체계적인 피트니스 관리를 하세요. / Manage counseling records and register new sessions for organized fitness tracking.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
