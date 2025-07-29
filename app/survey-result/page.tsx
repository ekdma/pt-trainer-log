import { Suspense } from 'react'
import SurveyResultPageClient from './SurveyResultPageClient' // useSearchParams 사용하는 컴포넌트

export default function SurveyResponsePage() {
  return (
    <main className="flex flex-col min-h-screen bg-gray-50 p-6">
      <Suspense fallback={<div>로딩 중...</div>}>
        <SurveyResultPageClient />
      </Suspense>
    </main>
  )
}