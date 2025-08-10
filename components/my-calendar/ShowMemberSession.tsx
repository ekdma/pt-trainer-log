'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import dayjs from 'dayjs'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { useLanguage } from '@/context/LanguageContext'

interface Session {
  calendar_sessions_id: string
  trainer_id: number
  member_id: number
  workout_date: string
  workout_time: string
  session_type: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

interface ShowMemberSessionProps {
  selectedDate: Date
  memberId: string
  onClose: () => void
}

export default function ShowMemberSession({ selectedDate, memberId, onClose }: ShowMemberSessionProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeTab, setActiveTab] = useState<'selected' | 'all'>('selected')
  const supabase = getSupabaseClient()
  const formattedDate = dayjs(selectedDate).format('YYYY-MM-DD')
  const { t } = useLanguage()  // 번역 함수 가져오기
  const statusKeyMap: Record<string, string> = {
    '확정': 'confirmed',
    '취소': 'canceled',
    '신청': 'requested',
  }

  useEffect(() => {
    if (!memberId) return

    const fetchSessions = async () => {
      let query = supabase
        .from('calendar_sessions')
        .select('*')
        .eq('member_id', memberId)

      if (activeTab === 'selected') {
        query = query.eq('workout_date', formattedDate).order('workout_time', { ascending: true })
      } else {
        query = query.order('workout_date', { ascending: false }).order('workout_time', { ascending: true })
      }

      const { data, error } = await query

      if (error) {
        console.error('세션 불러오기 실패:', error.message)
        setSessions([])
      } else {
        setSessions(data ?? [])
      }
    }

    fetchSessions()
  }, [selectedDate, memberId, activeTab, formattedDate])

  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-4 shadow-lg relative">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800">
          <XMarkIcon className="h-6 w-6" />
        </button>

        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
          {t('my_calendar.sessionList')}
        </h3>

        {/* 탭 선택 */}
        <div className="flex justify-center space-x-4 border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('selected')}
            className={`pb-2 font-semibold ${activeTab === 'selected' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-gray-500 hover:text-rose-600'}`}
          >
            {t('my_calendar.seletedDate')}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2 font-semibold ${activeTab === 'all' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-gray-500 hover:text-rose-600'}`}
          >
            {t('my_calendar.allDates')}
          </button>
        </div>

        {/* 세션 리스트 */}
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">
            {activeTab === 'selected' ? t('my_calendar.seletedDateNoClass') : t('my_calendar.noClass')}
          </p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <li
                key={session.calendar_sessions_id}
                className="flex justify-between items-center px-2 py-3 text-sm"
              >
                {/* 왼쪽: 날짜 + 시간 + 타입 + 상태를 한 줄로 */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-800">
                  <span className="font-semibold">
                    {dayjs(session.workout_date).format('MM/DD')} {session.workout_time.slice(0, 5)}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
                    {session.session_type}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      session.status === '확정'
                        ? 'bg-green-100 text-green-700'
                        : session.status === '취소'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {t(`master.${statusKeyMap[session.status] || 'requested'}`)}
                  </span>
                </div>

                {/* 오른쪽: 비고 */}
                {session.notes && (
                  <div
                    className="text-xs text-gray-500 italic truncate max-w-[120px] sm:max-w-[160px]"
                    title={session.notes}
                  >
                    📝 {session.notes}
                  </div>
                )}
              </li>
            ))}
          </ul>

        )}
      </div>
    </div>
  )
}
