import { Suspense } from 'react'
import TrainerCalendarPageClient from './TrainerCalendar' 
import TrainerHeader from '@/components/layout/TrainerHeader'

export default function TrainerCalendarPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TrainerHeader /> 
        <Suspense fallback={<div>로딩 중...</div>}>
          <TrainerCalendarPageClient />
        </Suspense>
    </div>
  )
}