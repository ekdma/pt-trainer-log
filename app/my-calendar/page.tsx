'use client'

import './MyCalendar.css' 
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import ReserveMemberSession from '@/components/my-calendar/ReserveMemberSession'
import ShowMemberSession from '@/components/my-calendar/ShowMemberSession'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { getSupabaseClient } from '@/lib/supabase'
import { ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/solid'
import { formatInTimeZone, format } from 'date-fns-tz'

type SessionInfo = Record<string, { status: string; type: string }[]>

export default function MyCalendarPage() {
  const supabase = getSupabaseClient()
  useAuthGuard()
  // const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const [memberId, setMemberId] = useState<string | null>(null)
  const [showSessionInfo, setShowSessionInfo] = useState(false)
  const [sessionMap, setSessionMap] = useState<SessionInfo>({})

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
      .eq('member_id', memberId)


    if (!error && data) {
      const map: SessionInfo = {}

      data.forEach((s) => {
        const date = formatInTimeZone(s.workout_date, 'Asia/Seoul', 'yyyy-MM-dd')
        if (!map[date]) map[date] = []
        map[date].push({ status: s.status, type: s.session_type })
      })

      setSessionMap(map)
      console.log("sessionlist: ", map)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">My Calendar</h2>

          <div className="flex flex-col md:flex-row gap-1">
            <div className="bg-white p-4 rounded shadow w-full md:w-1/2">
              <Calendar
                onChange={(value) => {
                  if (value instanceof Date) setSelectedDate(value)
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
                onClick={() => setShowSessionInfo(!showSessionInfo)}
                className="text-sm mt-4 w-full bg-[#a1a1a1] text-white py-2 rounded font-semibold hover:bg-[#a1a1a1] transition"
              >
                {showSessionInfo ? '신청내역 닫기' : '신청내역 보기'}
              </button>
            </div>

            {selectedDate && memberId && (
              <div className="space-y-4">
                <ReserveMemberSession
                  selectedDate={selectedDate}
                  memberId={memberId}
                  onSessionChange={fetchSessions}
                />
              </div>
            )}

            {showSessionInfo && (
              <ShowMemberSession
                selectedDate={selectedDate}
                memberId={memberId!}
                onClose={() => setShowSessionInfo(false)}
              />
            )}

          </div>
        </main>
      </div>
    </>
  )
}