'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MembersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    try {
      const raw = localStorage.getItem('litpt_member')
      const member = raw ? JSON.parse(raw) : null

      if (!member || member.role !== 'trainer') {
        router.replace('/not-authorized')
      }
    } catch (e) {
      router.replace('/not-authorized')
    }
  }, [router])

  return <>{children}</>
}