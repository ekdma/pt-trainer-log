'use client'

import { Suspense, useEffect, useState } from 'react'
import FoodDiaryPageClient from '../../components/food-diary/FoodDiaryPageClient'
import Header from '@/components/layout/Header'
import TrainerHeader from '@/components/layout/TrainerHeader'
import { useAuthGuard } from '@/hooks/useAuthGuard'

export default function FoodDiaryPage() {
  const [role, setRole] = useState<'member' | 'trainer' | null>(null)
  useAuthGuard()
  useEffect(() => {
    const raw = localStorage.getItem('litpt_member')
    const user = raw ? JSON.parse(raw) : null
    setRole(user?.role) // 예: 'member' 또는 'trainer'
  }, [])

  if (!role) return <div className="p-6">로딩 중...</div>

  return (
    <div className="bg-gray-50">
      {role === 'trainer' ? <TrainerHeader /> : <Header />}
      <Suspense fallback={<div className="p-6">로딩 중...</div>}>
        <FoodDiaryPageClient />
      </Suspense>
    </div>
  )
}
