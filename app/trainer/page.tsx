'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import TrainerHeader from '@/components/layout/TrainerHeader'
import MemberGoalsPart from '@/components/my/MemberGoalsPart'
import MemberCalendar from '@/components/my/MemberCalendar'

export default function HomePage() {
  useAuthGuard()
  const router = useRouter()

  const [scheduledDates, setScheduledDates] = useState<Date[]>([])

  useEffect(() => {
    // fetchGoals() / fetchSchedules()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <TrainerHeader />  

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* 🎯 목표 섹션 */}
          <section className="w-full md:w-1/2 bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">🎯 목표</h2>
            <MemberGoalsPart />
          </section>

          {/* 📅 일정 섹션 */}
          <section className="w-full md:w-1/2 bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">📅 일정</h2>
            <MemberCalendar />
          </section>
        </div>
      </main>
    </div>
  )
}
