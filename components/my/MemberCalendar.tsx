'use client'

import { useEffect, useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { getSupabaseClient } from '@/lib/supabase'
import dayjs from 'dayjs'
import { ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/solid'
import { Eye, EyeClosedIcon } from 'lucide-react';
import { format } from 'date-fns-tz'
import { useLanguage } from '@/context/LanguageContext'

type SessionDates = {
  pt: string[]
  group: string[]
  self: string[]
}
interface Member {
  member_id: number
  name: string
}

export default function MemberCalendar() {
  const [sessionDates, setSessionDates] = useState<SessionDates>({
    pt: [],
    group: [],
    self: [],
  })
  const [showSessionList, setShowSessionList] = useState(true)
  const supabase = getSupabaseClient()
  const [member, setMember] = useState<Member | null>(null)
  const [packagePeriod, setPackagePeriod] = useState<{ start: string; end: string } | null>(null)
  // const [selectedDate, setSelectedDate] = useState<Date>(new Date())   

  const renderedSessionCount =
    (sessionDates.pt.length > 0 ? 1 : 0) +
    (sessionDates.group.length > 0 ? 1 : 0) +
    (sessionDates.self.length > 0 ? 1 : 0)

  const desktopGridColsClass =
    renderedSessionCount === 3
      ? 'md:grid-cols-3'
      : renderedSessionCount === 2
      ? 'md:grid-cols-2'
      : 'md:grid-cols-1'

  const { t } = useLanguage()  // 번역 함수 가져오기

  useEffect(() => {
    const raw = localStorage.getItem('litpt_member')
    const parsed = raw ? JSON.parse(raw) : null
    setMember(parsed)
  }, [])
  
  useEffect(() => {
    if (!member) return;
  
    const fetchSessions = async () => {
      const today = dayjs().format('YYYY-MM-DD')
      const { data: packages } = await supabase
        .from('member_packages')
        .select('*')
        .eq('member_id', member.member_id)
        .eq('status', 'active')
        .lte('start_date', today)
        .gte('end_date', today)
  
      const currentPackage = packages?.[0]
      if (!currentPackage) return

      setPackagePeriod({
        start: dayjs(currentPackage.start_date).format('YYYY-MM-DD'),
        end: dayjs(currentPackage.end_date).format('YYYY-MM-DD'),
      });
  
      const { data: sessions } = await supabase
        .from('pt_sessions')
        .select('session_type, session_date')
        .eq('member_id', member.member_id)

      const pt: string[] = []
      const group: string[] = []
      const self: string[] = []

      sessions?.forEach((s) => {
        const sessionDay = dayjs(s.session_date).format('YYYY-MM-DD')
        const startDay = dayjs(currentPackage.start_date).format('YYYY-MM-DD')
        const endDay = dayjs(currentPackage.end_date).format('YYYY-MM-DD')
      
        // 문자열 비교로 start_date ≤ session_date ≤ end_date 보장
        if (sessionDay >= startDay && sessionDay <= endDay) {
          if (s.session_type === 'PT') pt.push(sessionDay)
          else if (s.session_type === 'GROUP') group.push(sessionDay)
          else if (s.session_type === 'SELF') self.push(sessionDay)
        }
      })

      setSessionDates({
        pt: Array.from(new Set(pt)),
        group: Array.from(new Set(group)),
        self: Array.from(new Set(self)),
      })
    }

    fetchSessions()
  }, [member])

  const todayStr = dayjs().format('YYYY-MM-DD')

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        onClick={() => setShowSessionList(prev => !prev)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-full hover:bg-indigo-100 transition"
      >
        {showSessionList ? (
            <>
            <EyeClosedIcon className="w-4 h-4" />
            {t('my.sessionClose')}
            </>
        ) : (
            <>
            <Eye className="w-4 h-4" />
            {t('my.sessionView')}
            </>
        )}
      </button>

      {/* <button
        onClick={() => setSelectedDate(new Date())}
        className="mb-2 px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
      >
        Today
      </button> */}
      
      <Calendar
        className="mx-auto"
        prev2Label={<ChevronDoubleLeftIcon className="w-4 h-4 text-gray-500" />}
        prevLabel={<ChevronLeftIcon className="w-4 h-4 text-gray-600" />}
        nextLabel={<ChevronRightIcon className="w-4 h-4 text-gray-600" />}
        next2Label={<ChevronDoubleRightIcon className="w-4 h-4 text-gray-500" />}
        tileClassName={({ date }) => {
          const d = dayjs(date).format('YYYY-MM-DD');
          const isToday = d === todayStr
          if (sessionDates.pt.includes(d)) return 'pt-session';
          if (sessionDates.group.includes(d)) return 'group-session';
          if (sessionDates.self.includes(d)) return 'self-session';
          if (isToday) return 'today-tile'

          if (packagePeriod && d >= packagePeriod.start && d <= packagePeriod.end) {
            return 'package-active';
          }
          return ''
        }}
        formatShortWeekday={(_locale, date) => date.toLocaleDateString('en-US', { weekday: 'short' })}
        formatMonthYear={(_locale, date) =>
          format(date, 'yyyy.MM')  
        }
        formatDay={(_locale, date) => date.getDate().toString()}
      />

      {showSessionList && (
        <div className={`mt-4 grid grid-cols-1 ${desktopGridColsClass} gap-4 w-full max-w-4xl`}>
          {/* PT 세션 카드 */}
          {sessionDates.pt.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 shadow-sm border border-blue-300">
              <h4 className="flex items-center gap-2 text-blue-700 font-semibold mb-3">
                <span>PT Sessions</span>  
              </h4>
              <div className="space-y-1 text-blue-800 font-medium text-sm">
                {sessionDates.pt
                  .slice()
                  .sort()
                  .map((d) => (
                    <div key={`pt-${d}`} className="px-1 py-1 rounded hover:bg-blue-100 cursor-default transition">
                      {dayjs(d).format('YYYY.MM.DD (ddd)')}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* GROUP 세션 카드 */}
          {sessionDates.group.length > 0 && (
            <div className="bg-purple-50 rounded-lg p-4 shadow-sm border border-purple-300">
              <h4 className="flex items-center gap-2 text-purple-700 font-semibold mb-3">
                <span>Group Sessions</span> 
              </h4>
              <div className="space-y-1 text-purple-800 font-medium text-sm">
                {sessionDates.group
                  .slice()
                  .sort()
                  .map((d) => (
                    <div key={`group-${d}`} className="px-1 py-1 rounded hover:bg-purple-100 cursor-default transition">
                      {dayjs(d).format('YYYY.MM.DD (ddd)')}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* SELF 세션 카드 */}
          {sessionDates.self.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4 shadow-sm border border-green-300">
              <h4 className="flex items-center gap-2 text-green-700 font-semibold mb-3">
                <span>Self Sessions</span> 
              </h4>
              <div className="space-y-1 text-green-800 font-medium text-sm">
                {sessionDates.self
                  .slice()
                  .sort()
                  .map((d) => (
                    <div key={`self-${d}`} className="px-1 py-1 rounded hover:bg-green-100 cursor-default transition">
                      {dayjs(d).format('YYYY.MM.DD (ddd)')}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}