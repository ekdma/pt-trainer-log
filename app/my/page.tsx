'use client'

import { useEffect } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import Header from '@/components/layout/Header'
import MemberGoalsPart from '@/components/my/MemberGoalsPart'
import MemberCalendar from '@/components/my/MemberCalendar'
import EmptyStomachWeightChart from '@/components/my/EmptyStomachWeightChart' 

export default function HomePage() {
  useAuthGuard()

  useEffect(() => {
    // fetchGoals() / fetchSchedules()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />  

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          
          {/* 왼쪽: 공복체중 + 목표 */}
          <div className="w-full md:w-1/2 flex flex-col gap-6">
            <section className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">💪 Empty Stomach Weight</h2>
              <EmptyStomachWeightChart />
            </section>

            <section className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">🎯 목표</h2>
              <MemberGoalsPart />
            </section>
          </div>

          {/* 오른쪽: 일정 */}
          <section className="w-full md:w-1/2 bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">📅 일정</h2>
            <MemberCalendar />
          </section>

        </div>
      </main>

    </div>
  )
}
