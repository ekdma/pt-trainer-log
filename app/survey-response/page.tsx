import { Suspense } from 'react'
import SurveyResponsePageClient from './SurveyResponsePageClient' // useSearchParams 사용하는 컴포넌트

export default function SurveyResponsePage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <SurveyResponsePageClient />
    </Suspense>
  )
}