// app/members/layout.tsx (서버 컴포넌트)
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "회원 관리 | Members",
  description: "전체 회원 정보를 빠르게 조회하고 편리하게 관리하세요. / Quickly view and efficiently manage all member information.",
}

// 클라이언트 기능 분리는 아래 컴포넌트에서
import MembersClient from './MembersClient'

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return <MembersClient>{children}</MembersClient>
}
