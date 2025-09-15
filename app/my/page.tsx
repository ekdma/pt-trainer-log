'use client'

import { useEffect, useState } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import Header from '@/components/layout/Header'
import MemberGoalsPart from '@/components/my/MemberGoalsPart'
import MemberCalendar from '@/components/my/MemberCalendar'
import EmptyStomachWeightChart from '@/components/my/EmptyStomachWeightChart' 
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react';

interface Member {
  member_id: number
  name: string
}

export default function HomePage() {
  useAuthGuard()

  const { t } = useLanguage()
  const [goalImageUrl, setGoalImageUrl] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [member, setMember] = useState<Member | null>(null)
  const [doNotShow, setDoNotShow] = useState(false) // ✅ 체크박스 상태

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    const raw = localStorage.getItem('litpt_member')
    const parsed = raw ? JSON.parse(raw) : null
    setMember(parsed)
  }, [])

  useEffect(() => {
    if (!member) return

    const fetchGoalImage = async () => {
      // 'doNotShowGoalPopup' 체크
      const hideUntil = localStorage.getItem(`doNotShowGoalPopup_${member.member_id}`)
      const now = Date.now()

      // 저장된 시간이 있고, 아직 오늘 자정 이전이면 모달 표시 안 함
      if (hideUntil && parseInt(hideUntil) > now) return

      const { data, error } = await supabase
        .from('member_goals')
        .select('goal_image_url')
        .eq('member_id', member.member_id)
        .eq('goal_type', 'image')
        .not('goal_image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!error && data?.goal_image_url) {
        setGoalImageUrl(data.goal_image_url)
        setShowModal(true)
      }
    }

    fetchGoalImage()
  }, [member])

  const handleCloseModal = () => {
    if (doNotShow && member) {
      // 오늘 자정까지 시간 계산
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setHours(24, 0, 0, 0) // 오늘 자정 -> 내일 0시
      const expireTime = tomorrow.getTime() // 밀리초

      localStorage.setItem(
        `doNotShowGoalPopup_${member.member_id}`,
        expireTime.toString()
      )
    }
    setShowModal(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />  

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/2 flex flex-col gap-6">
            <section className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                💪 {t('my.fastingWeightData')}
              </h2>
              <EmptyStomachWeightChart />
            </section>

            <section className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                🎯 {t('my.goals')}
              </h2>
              <MemberGoalsPart />
            </section>
          </div>

          <section className="w-full md:w-1/2 bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              📅 {t('my.schedule')}
            </h2>
            <MemberCalendar />
          </section>
        </div>
      </main>

      {/* 🔹 팝업 모달 */}
      {showModal && goalImageUrl && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 relative max-w-lg w-full">
            <button
              className="absolute top-5 right-5 text-gray-600 hover:text-gray-900"
              onClick={handleCloseModal}
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {t('my.goalImage')}
            </h3>

            <p className="text-sm text-gray-500 mb-4">
              {t('my.goalImageDescription')}
            </p>

            <img
              src={goalImageUrl}
              alt="Goal Image"
              className="rounded-xl mx-auto mb-4 max-w-full max-h-[400px] object-contain cursor-pointer"
              onClick={handleCloseModal} // ✅ 이미지 클릭 시 모달 닫기
            />


            {/* 🔹 체크박스: 더 이상 보지 않기 */}
            <div className="flex items-center self-start mb-2">
              <input
                type="checkbox"
                id="doNotShowGoal"
                checked={doNotShow}
                onChange={(e) => setDoNotShow(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="doNotShowGoal" className="text-sm text-gray-700">
                {t('my.doNotShowAgain')}
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}