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
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'

type SessionInfo = Record<string, { status: string; type: string }[]>

export default function MyCalendarPage() {
  const supabase = getSupabaseClient()
  useAuthGuard()
  const { t } = useLanguage()  // 번역 함수 가져오기
  const { user } = useAuth()

  // const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const [memberId, setMemberId] = useState<string | null>(null)
  const [showSessionInfo, setShowSessionInfo] = useState(false)
  const [sessionMap, setSessionMap] = useState<SessionInfo>({})
  const [packages, setPackages] = useState<{ start_date: string; end_date: string }[]>([])

  useEffect(() => {
    if (!user) return
    setMemberId(String(user.member_id))
  }, [user])
  
  useEffect(() => {
    if (!memberId) return
  
    const fetchPackages = async () => {
      const { data, error } = await supabase
        .from('member_packages')
        .select('start_date, end_date')
        .eq('member_id', memberId)
        .eq('status', 'active')
  
      if (!error && data) {
        setPackages(data)
      }
    }
  
    fetchPackages()
  }, [memberId])

  // useEffect(() => {
  //   // 예: localStorage에서 memberId 가져오기
  //   const raw = localStorage.getItem('litpt_member')
  //   if (raw) {
  //     try {
  //       const user = JSON.parse(raw)
  //       if (user?.member_id) setMemberId(user.member_id)
  //     } catch {}
  //   }
  // }, [])

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
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {t('my_calendar.myCalendar')}
          </h2>

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
                
                  // 패키지 기간 체크
                  const isInPackage = packages.some(pkg => {
                    const start = formatInTimeZone(new Date(pkg.start_date), 'Asia/Seoul', 'yyyy-MM-dd')
                    const end = formatInTimeZone(new Date(pkg.end_date), 'Asia/Seoul', 'yyyy-MM-dd')
                    return formatted >= start && formatted <= end
                  })
                
                  const classes: string[] = []
                
                  if (isSelected && isInPackage) {
                    classes.push('react-calendar__tile--selected-custom')
                  } else {
                    if (isInPackage) classes.push('package-active')
                    if (isSelected) classes.push('react-calendar__tile--selected-custom')
                  }
                
                  if (sessionList) {
                    const statuses = sessionList.map(s => s.status)
                    if (statuses.includes('신청')) {
                      classes.push('bg-status-pending')
                    } else if (sessionList.some(s => s.status === '확정' && s.type === 'PT')) {
                      classes.push('bg-status-confirmed_pt')
                    } else if (
                      sessionList.some(s => s.status === '확정' && s.type === 'SELF')
                    ) {
                      // ✅ "SELF 확정"이 있을 때만 색상 적용
                      classes.push('bg-status-confirmed_self')
                    }
                    // ✅ 모든 세션이 취소라면 색상 없음 (else 없음)
                  }
                  return classes.join(' ')
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
                {showSessionInfo ? t('my_calendar.closeApplication') : t('my_calendar.viewApplication')}
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