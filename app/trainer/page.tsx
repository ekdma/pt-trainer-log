'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import TrainerHeader from '@/components/layout/TrainerHeader'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwipeable } from 'react-swipeable'
import { useRouter } from 'next/navigation'

interface CalendarSession {
  calendar_sessions_id: string
  workout_date: string
  workout_time: string
  session_type: string
  member_id: string
  status: string
  members: {
    name: string
  }
}

const HOURS = Array.from({ length: 16 }, (_, i) => 6 + i)

export default function HomePage() {
  const supabase = getSupabaseClient()
  const [sessions, setSessions] = useState<CalendarSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedMemberId, setSelectedMemberId] = useState<string | number | null>(null)
  const [now, setNow] = useState(new Date())
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 60 * 1000) // 1분마다
    return () => clearInterval(timer)
  }, [])
  
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const minutePosition = (currentMinute / 60) * 100 // 셀 안에서의 위치(백분율)
  
  const getColorStyleForMember = (memberId: string | number | null | undefined, status?: string) => {
    if (memberId == null) return {}
    
    if (status === '신청') {
      return {
        backgroundColor: 'rgba(254, 202, 202, 0.5)', // tailwind rose-200 반투명
        color: '#b91c1c', // tailwind rose-800 정도
      }
    }

    const strId = String(memberId)
    let hash = 0
    for (let i = 0; i < strId.length; i++) {
      hash = strId.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash) % 360
    return {
      backgroundColor: `hsl(${hue}, 90%, 90%)`,
      color: `hsl(${hue}, 30%, 30%)`,
    }
  }
  

  useAuthGuard()

  useEffect(() => {
    const fetchWeeklySessions = async () => {
      setLoading(true)
      setError(null)

      const startDateStr = format(currentWeekStart, 'yyyy-MM-dd')
      const endDateStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('calendar_sessions')
        .select('calendar_sessions_id, workout_date, workout_time, session_type, member_id, status, members(name)')
        .in('status', ['확정', '신청'])
        .gte('workout_date', startDateStr)
        .lte('workout_date', endDateStr)
        .order('workout_date', { ascending: true })
        .order('workout_time', { ascending: true })

      if (error) {
        setError('일정을 불러오는 중 오류가 발생했습니다.')
        console.error(error)
      } else {
        const normalized = data.map((item) => ({
          ...item,
          members: Array.isArray(item.members) ? item.members[0] : item.members,
        }))
        setSessions(normalized)
      }
      setLoading(false)
    }

    fetchWeeklySessions()
  }, [currentWeekStart])

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i))
  const today = new Date()
  const prevWeek = () => setCurrentWeekStart((prev) => addDays(prev, -7))
  const nextWeek = () => setCurrentWeekStart((prev) => addDays(prev, 7))

  const handlers = useSwipeable({
    onSwipedLeft: () => nextWeek(),
    onSwipedRight: () => prevWeek(),
    preventScrollOnSwipe: true,
    trackMouse: false,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <TrainerHeader />

      <main 
        {...handlers}
        className="max-w-7xl mx-auto px-4 py-8"
      >
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
          <div className="flex flex-row items-center gap-2 flex-wrap sm:flex-nowrap">
            <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 whitespace-nowrap">
              Weekly Schedule
            </h2>
            <AnimatePresence mode="wait">
              {selectedMemberId && (
                <motion.div
                  key={selectedMemberId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="font-semibold text-[10px] sm:text-sm px-2 py-1 rounded shadow-sm whitespace-nowrap"
                  style={getColorStyleForMember(selectedMemberId)}
                >
                  Selected: {sessions.find(s => s.member_id === selectedMemberId)?.members?.name || '이름 없음'}
                </motion.div>
              
              )}
            </AnimatePresence>
            {selectedMemberId !== null && (
              <button
                onClick={() => setSelectedMemberId(null)}
                className="px-2 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold text-[10px] sm:text-sm whitespace-nowrap"
              >
                Show All
              </button>
            )}
          </div>
          <button
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="ml-auto px-1 py-1 rounded bg-rose-200 hover:bg-rose-300 text-rose-800 font-semibold text-[10px] sm:text-sm whitespace-nowrap"
          >
            Today
          </button>

          {/* 이전/다음 버튼 (sm 이상에서만 노출) */}
          <div className="hidden sm:flex gap-2 ml-4">
            <button
              onClick={prevWeek}
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-xs sm:text-sm"
            >
              &lt;
            </button>
            <button
              onClick={nextWeek}
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-xs sm:text-sm"
            >
              &gt;
            </button>
          </div>
        </div>

        {loading && (
          <div className="w-full text-center py-10 text-gray-500 text-sm sm:text-base">
            Loading...
          </div>
        )}

        {/* error 상태 표시 */}
        {error && (
          <div className="w-full text-center py-4 text-red-600 font-semibold">
            {error}
          </div>
        )}

        {/* {!loading && !error && sessions.length === 0 && (
          <div className="w-full text-center py-10 text-gray-400 text-sm sm:text-base select-none">
            이번 주 일정이 없습니다.
          </div>
        )} */}

        {!loading && !error && (
          <div className="overflow-auto border border-gray-300 rounded-lg bg-white shadow">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr>
                  <th
                    className="border border-gray-300 w-9 sm:w-16 bg-gray-100
                      text-center text-sm sm:text-xs font-semibold
                      px-1 py-1"
                  ></th>
                  {weekDays.map((day) => (
                    <th 
                      key={format(day, 'yyyy-MM-dd')} 
                      className={`border border-gray-300 px-1 py-1 text-center
                        text-[10px] sm:text-[12px] font-semibold
                        ${isSameDay(day, today) ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700'}`}
                      >
                      <div>{format(day, 'EEE')}</div>
                      <div>{format(day, 'MM/dd')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => {
                  const hourStr = hour.toString().padStart(2, '0') + ':00'
                  const isCurrentHour = hour === currentHour

                  return (
                    <tr key={hour} className={isCurrentHour ? 'relative' : ''}>
                      <td
                        className="border border-gray-300 px-1 py-1 text-center text-[10px] sm:text-[12px] bg-gray-100 font-mono w-9 sm:w-16"
                      >
                        {hour}:00
                      </td>
                      {weekDays.map((day) => {
                        const cellSessions = sessions.filter(
                          (s) =>
                            s.workout_date === format(day, 'yyyy-MM-dd') &&
                            s.workout_time.startsWith(hourStr) &&
                            (selectedMemberId === null || s.member_id === selectedMemberId)
                        )
                      
                        // 신청 상태만 카운트
                        const applyCount = cellSessions.filter(s => s.status === '신청').length

                        return (
                          <td
                            key={format(day, 'yyyy-MM-dd') + '-' + hour}
                            className="border border-gray-300 px-1 py-1 align-top min-h-[48px] max-h-[72px] overflow-hidden relative text-[10px] sm:text-[9px]"
                          >
                            {isCurrentHour && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: `${minutePosition}%`,
                                  left: 0,
                                  right: 0,
                                  borderTop: '1px dashed red',
                                  opacity: 0.5,
                                  pointerEvents: 'none',
                                  zIndex:5,
                                }}
                              />
                            )}

                            {cellSessions.length > 0 ? (
                              cellSessions.map((session, idx) => (
                                <motion.div
                                  onClick={() => {
                                    // setSelectedMemberId(session.member_id) // 기존 기능 유지
                                    // 신청일 때만 /calendar 이동
                                    if (session.status === '신청') {
                                      router.push(`/calendar?date=${session.workout_date}`)
                                    } else {
                                      setSelectedMemberId(session.member_id)
                                    }
                                  }}
                                  layout
                                  whileHover={{ scale: 1.04 }}
                                  whileTap={{ scale: 0.97 }}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                  style={getColorStyleForMember(session.member_id, session.status)}
                                  className={`
                                    relative rounded px-1 py-0.5 text-[10px] sm:text-[12px] font-semibold truncate cursor-pointer 
                                    flex flex-col items-center justify-center text-center
                                    min-h-[24px]
                                    ${session.status === '신청' ? 'opacity-80 border border-dashed border-rose-400' : ''}
                                  `}
                                  title={`${session.workout_time} | ${session.status}`}
                                >
                                  {session.status === '신청' ? (
                                    <span className="absolute top-0.5  bg-rose-500 text-white text-[8px] px-1 py-0.5 rounded-full">
                                      신청 {applyCount}
                                    </span>
                                  ) : (
                                    <>
                                      {session.workout_time?.slice(0, 5)} <br />
                                      {session.session_type} <br />
                                      {session.members?.name || '이름 없음'}
                                    </>
                                  )}
                                </motion.div>
                              ))
                            ) : (
                              <div className="text-gray-300 text-xs text-center select-none">-</div>
                            )}
                          </td>

                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
