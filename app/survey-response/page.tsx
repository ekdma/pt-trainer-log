import { Suspense } from 'react'
import SurveyResponsePageClient from './SurveyResponsePageClient' 
import TrainerHeader from '@/components/layout/TrainerHeader'

export default function SurveyResponsePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TrainerHeader /> 
        <Suspense fallback={<div>로딩 중...</div>}>
          <SurveyResponsePageClient />
        </Suspense>
    </div>
  )
}