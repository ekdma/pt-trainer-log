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
      
      <Calendar
        className="mx-auto"
        prev2Label={<ChevronDoubleLeftIcon className="w-4 h-4 text-gray-500" />}
        prevLabel={<ChevronLeftIcon className="w-4 h-4 text-gray-600" />}
        nextLabel={<ChevronRightIcon className="w-4 h-4 text-gray-600" />}
        next2Label={<ChevronDoubleRightIcon className="w-4 h-4 text-gray-500" />}
        tileClassName={({ date }) => {
          const d = dayjs(date).format('YYYY-MM-DD')
          if (sessionDates.pt.includes(d)) return 'pt-session'
          if (sessionDates.group.includes(d)) return 'group-session'
          if (sessionDates.self.includes(d)) return 'self-session'
          return ''
        }}
        formatShortWeekday={(_locale, date) => date.toLocaleDateString('en-US', { weekday: 'short' })}
        formatMonthYear={(_locale, date) =>
          format(date, 'yyyy.MM')  
        }
        formatDay={(_locale, date) => date.getDate().toString()}
      />

      {showSessionList && (
        <div className="mt-4 space-y-3 text-sm w-full max-w-md">
          {/* PT 세션 */}
          {sessionDates.pt.length > 0 && (
            <>
              <h4 className="text-gray-700 font-semibold mb-1">🏋️ PT 세션</h4>
              {sessionDates.pt
                .slice()
                .sort()
                .map((d) => (
                  <div key={`pt-${d}`} className="text-blue-700">
                    {dayjs(d).format('YYYY.MM.DD (dd)')}
                  </div>
                ))}
            </>
          )}

          {/* GROUP 세션 */}
          {sessionDates.group.length > 0 && (
            <>
              <h4 className="text-gray-700 font-semibold mt-3 mb-1">👥 GROUP 세션</h4>
              {sessionDates.group
                .slice()
                .sort()
                .map((d) => (
                  <div key={`group-${d}`} className="text-purple-700">
                    {dayjs(d).format('YYYY.MM.DD (dd)')}
                  </div>
                ))}
            </>
          )}

          {/* SELF 세션 */}
          {sessionDates.self.length > 0 && (
            <>
              <h4 className="text-gray-700 font-semibold mt-3 mb-1">🏃 SELF 세션</h4>
              {sessionDates.self
                .slice()
                .sort()
                .map((d) => (
                  <div key={`self-${d}`} className="text-gray-700">
                    {dayjs(d).format('YYYY.MM.DD (dd)')}
                  </div>
                ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}