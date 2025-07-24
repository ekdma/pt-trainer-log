'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import FoodDiaryMemberView from './FoodDiaryMemberView'
import FoodDiaryTrainerView from './FoodDiaryTrainerView'

type Role = 'member' | 'trainer'

interface SessionUser {
  id: string
  email: string
  role: Role
  member_id?: string
  name?: string
  nickname?: string
}

export default function FoodDiaryPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  const memberIdFromQuery = searchParams.get('memberId') || ''
  const memberNameFromQuery = searchParams.get('memberName') || ''

  useAuthGuard()

  useEffect(() => {
    const raw = localStorage.getItem('litpt_member')
    if (!raw) {
      router.replace('/not-authorized')
      return
    }

    try {
      const parsed = JSON.parse(raw)
      if (!parsed || !parsed.role) {
        router.replace('/not-authorized')
        return
      }
      setUser(parsed)
    } catch (err) {
      console.error('Failed to parse user info:', err)
      router.replace('/not-authorized')
    } finally {
      setLoading(false)
    }
  }, [router])

  if (loading) return <div className="p-6">로딩 중...</div>
  if (!user) return <div className="p-6">사용자 정보를 불러올 수 없습니다.</div>

  if (user.role === 'member') {
    return (
      <main className="flex flex-col min-h-screen bg-gray-50 p-6">
        <div className="w-full max-w-screen-lg mx-auto">
          {/* <div className="flex items-center justify-between mb-4">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-rose-700">
              <Utensils size={25} />
              Food Diary
            </h1>
            <Button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-sm text-rose-600 border border-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition duration-200"
            >
              <ArrowLeft size={16} />
              뒤로
            </Button>
          </div> */}
          <FoodDiaryMemberView 
            memberId={user.member_id!} 
            memberName={(user.nickname || user.name)!}
          />

        </div>
      </main>
    )
  }

  const initialSelectedMember = memberIdFromQuery
    ? { member_id: memberIdFromQuery, name: memberNameFromQuery }
    : null

  return (
    <main className="flex flex-col min-h-screen bg-gray-50 p-6">
      <div className="w-full max-w-screen-lg mx-auto">
        {/* <div className="flex items-center justify-between mb-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-rose-700">
            <Utensils size={25} />
            Food Diary
          </h1>
          <Button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-rose-600 border border-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition duration-200"
          >
            <ArrowLeft size={16} />
            뒤로
          </Button>
        </div> */}
        <FoodDiaryTrainerView initialSelectedMember={initialSelectedMember} />
      </div>
    </main>
  )
}
