// app/calendar/page.tsx
'use client'

import './MyCalendar.css' 
import { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/solid'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
// import TrainerHeader from '@/components/layout/TrainerHeader'
import { getSupabaseClient } from '@/lib/supabase'
import ConfirmSession from '@/components/calendar/ConfirmSession'
import ReserveSession from '@/components/calendar/ReserveSession'
import { formatInTimeZone, format } from 'date-fns-tz'
import { useRouter, useSearchParams } from 'next/navigation'

type SessionInfo = Record<string, { status: string; type: string }[]>

export default function TrainerCalendarPageClient() {
  const supabase = getSupabaseClient()
  // const [selectedDate, setSelectedDate] = useState(new Date())
  const [memberId, setMemberId] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [sessionMap, setSessionMap] = useState<SessionInfo>({})
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const initialDate = searchParams.get('date')
  ? new Date(searchParams.get('date')!)
  : new Date()

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate)

  useEffect(() => {
    // 예: localStorage에서 memberId 가져오기
    const raw = localStorage.getItem('litpt_member')
    if (raw) {
      try {
        const user = JSON.parse(raw)
        if (user?.member_id) setMemberId(user.member_id)
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (!memberId) return
    fetchSessions()
  }, [memberId])

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('calendar_sessions')
      .select('workout_date, status, session_type')
      .eq('trainer_id', memberId)


    if (!error && data) {
      const map: SessionInfo = {}

      data.forEach((s) => {
        const date = formatInTimeZone(s.workout_date, 'Asia/Seoul', 'yyyy-MM-dd')
        if (!map[date]) map[date] = []
        map[date].push({ status: s.status, type: s.session_type })
      })

      setSessionMap(map)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* <TrainerHeader /> */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Trainer Calendar</h2>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="bg-white p-4 rounded shadow">
            <Calendar
              onChange={(value) => {
                if (value instanceof Date) {
                  setSelectedDate(value)
                  const formatted = format(value, 'yyyy-MM-dd')
                  router.push(`/calendar?date=${formatted}`)
                }
              }}
              value={selectedDate}
              calendarType="gregory"
              tileClassName={({ date }) => {
                const formatted = formatInTimeZone(date, 'Asia/Seoul', 'yyyy-MM-dd')
                const sessionList = sessionMap[formatted]
                const isSelected = formatInTimeZone(selectedDate, 'Asia/Seoul', 'yyyy-MM-dd') === formatted
              
                if (isSelected) {
                  return 'react-calendar__tile--selected-custom'
                }
              
                if (!sessionList) {
                  return ''
                }
              
                const statuses = sessionList.map((s) => s.status)
                const hasPending = statuses.includes('신청')
              
                if (hasPending) {
                  return 'bg-status-pending'
                }
              
                const hasConfirmedPT = sessionList.some(
                  (s) => s.status === '확정' && s.type === 'PT'
                )
              
                if (hasConfirmedPT) {
                  return 'bg-status-confirmed_pt'
                }
              
                const allCancelled = sessionList.every((s) => s.status === '취소')
                if (allCancelled) {
                  return ''
                }
              
                const hasOnlySelfOrCancelled = sessionList.every(
                  (s) =>
                    (s.status === '확정' && s.type === 'SELF') ||
                    s.status === '취소'
                )
              
                if (hasOnlySelfOrCancelled) {
                  return 'bg-status-confirmed_self'
                }
              
                return ''
              }}
              formatShortWeekday={(_locale, date) => date.toLocaleDateString('en-US', { weekday: 'short' })}
              formatMonthYear={(_locale, date) =>
                format(date, 'yyyy.MM') // date-fns 사용 예시
              }
              formatDay={(_locale, date) => date.getDate().toString()}
              prev2Label={<ChevronDoubleLeftIcon className="w-4 h-4 text-gray-500" />}
              prevLabel={<ChevronLeftIcon className="w-4 h-4 text-gray-600" />}
              nextLabel={<ChevronRightIcon className="w-4 h-4 text-gray-600" />}
              next2Label={<ChevronDoubleRightIcon className="w-4 h-4 text-gray-500" />}
            />

            <button
              onClick={() => setShowConfirmModal(!showConfirmModal)}
              className="text-sm mt-4 w-full bg-[#a1a1a1] text-white py-2 rounded font-semibold hover:bg-[#a1a1a1] transition"
            >
              {showConfirmModal ? '신청내역 닫기' : '신청내역 보기'}
            </button>
          </div>

          {selectedDate && memberId && (
            <div className="space-y-4">
              <ReserveSession
                key={selectedDate.toISOString()}
                selectedDate={selectedDate}
                trainerId={memberId}
                onSessionChange={fetchSessions}
              />
            </div>
          )}

          {showConfirmModal && memberId && (
            <ConfirmSession
              trainerId={memberId}
              onClose={() => setShowConfirmModal(false)}
              onSessionChange={fetchSessions}
            />
          )}
        </div>
      </main>
    </div>
  )
}