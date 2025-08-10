'use client'

import { Suspense, useEffect, useState } from 'react'
import FoodDiaryPageClient from '../../components/food-diary/FoodDiaryPageClient'
import Header from '@/components/layout/Header'
import TrainerHeader from '@/components/layout/TrainerHeader'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { useLanguage } from '@/context/LanguageContext'

export default function FoodDiaryPage() {
  const [role, setRole] = useState<'member' | 'trainer' | null>(null)
  useAuthGuard()
  const { t } = useLanguage()  // 번역 함수 가져오기

  useEffect(() => {
    const raw = localStorage.getItem('litpt_member')
    const user = raw ? JSON.parse(raw) : null
    setRole(user?.role) // 예: 'member' 또는 'trainer'
  }, [])

  if (!role) return <div className="p-6">{t('master.loading')}</div>

  return (
    <div className="bg-gray-50">
      {role === 'trainer' ? <TrainerHeader /> : <Header />}
      <Suspense fallback={<div className="p-6">{t('master.loading')}</div>}>
        <FoodDiaryPageClient />
      </Suspense>
    </div>
  )
}
