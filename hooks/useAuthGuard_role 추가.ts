'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function useAuthGuard(): 'trainer' | 'member' | null {
  const router = useRouter()
  const [role, setRole] = useState<'trainer' | 'member' | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('litpt_member')
    if (!stored) {
      router.replace('/')
      return
    }

    try {
      const user = JSON.parse(stored)
      if (!user.role) {
        router.replace('/')
        return
      }

      setRole(user.role)
    } catch {
      router.replace('/')
    }
  }, [])

  return role
}
