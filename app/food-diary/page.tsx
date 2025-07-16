import { Suspense } from 'react'
import FoodDiaryPageClient from './FoodDiaryPageClient'

export default function FoodDiaryPage() {
  return (
    <Suspense fallback={<div className="p-6">로딩 중...</div>}>
      <FoodDiaryPageClient />
    </Suspense>
  )
}
