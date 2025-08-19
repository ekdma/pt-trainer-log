import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "패키지 관리 | Packages",
  description: "수강권과 패키지를 확인하고 편리하게 관리하세요. / View and efficiently manage your training packages.",
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
