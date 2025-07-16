// hooks/useAuthGuard.ts
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useAuthGuard() {
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('litpt_member')
    if (!stored) {
      router.replace('/')
    }
  }, [])
}
  
