'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import dayjs from 'dayjs'
import { X } from 'lucide-react'
import ParticipantsModal from './ParticipantsModal'

interface GroupSession {
  id: number
  date: string
  theme: string
  workouts: string[]
  participants: string[]
}

interface ViewTotalGroupSessionModalProps {
  onClose: () => void
}

export default function ViewTotalGroupSessionModal({ onClose }: ViewTotalGroupSessionModalProps) {
  const [sessions, setSessions] = useState<GroupSession[]>([])
  const [workoutNames, setWorkoutNames] = useState<string[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedParticipants, setSelectedParticipants] = useState<string[] | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('') // 참가자 이름 검색어 상태
  
  const supabase = getSupabaseClient()

  const fetchData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('group_sessions')
      .select(`
        group_session_id,
        group_session_date,
        theme,
        group_session_workouts:group_session_workouts (
          workout_name
        ),
        group_session_participants:group_session_participants (
          members (
            name
          )
        )
      `)
      .order('group_session_date', { ascending: true })

    if (error || !data) {
      console.error('전체보기 로딩 실패:', error)
      return
    }

    const grouped: GroupSession[] = data.map((s: any) => ({
      id: s.group_session_id,
      date: dayjs(s.group_session_date).format('YY.MM.DD'),
      theme: s.theme,
      workouts: s.group_session_workouts?.map((w: any) => w.workout_name) ?? [],
      participants: s.group_session_participants?.map((p: any) => p.members?.name ?? '이름 없음') ?? [],
    }))

    const allWorkoutsSet = new Set<string>()
    grouped.forEach(s => s.workouts.forEach((w: string) => allWorkoutsSet.add(w)))

    const uniqueDates = [...new Set(grouped.map(s => s.date))]

    setSessions(grouped)
    setWorkoutNames(Array.from(allWorkoutsSet))
    setDates(uniqueDates)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 검색어로 필터링한 세션 리스트
  const filteredSessions = searchTerm
    ? sessions.filter(session =>
        session.participants.some(p =>
          p.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : sessions

  // 필터링된 세션에서 날짜만 추출 (날짜도 필터링 반영)
  const filteredDates = [...new Set(filteredSessions.map(s => s.date))]

  // date별로 세션 가져오기 (필터된 세션 기준)
  const getSessionsByDate = (date: string) => filteredSessions.filter(s => s.date === date)

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
      <div className="relative bg-white w-full max-w-5xl max-h-[90vh] overflow-auto rounded-xl shadow-lg p-6">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold mb-4 text-purple-700">전체 그룹세션 요약</h2>

        {/* 참가자 이름 검색 input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="참가자 이름으로 검색"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {loading ? (
          <div className="text-center text-gray-500">불러오는 중...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[600px] w-full table-fixed border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border text-center border-gray-200 bg-gray-100 w-32 text-sm">운동</th>
                  {filteredDates.map(date => {
                    const session = getSessionsByDate(date)[0]
                    return (
                      <th key={date} className="text-center p-2 border border-gray-200 bg-gray-100">
                        <div className="font-semibold">{date}</div>
                        <div className="text-xs text-gray-500">
                          {session?.theme ?? '-'}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedParticipants(session?.participants ?? [])
                            setSelectedDate(date)
                          }}
                          className="text-purple-600 text-xs mt-1 hover:underline"
                        >
                          참가자 보기
                        </button>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {workoutNames.map(workout => (
                  <tr key={workout}>
                    <td className="p-2 border border-gray-200 font-medium text-sm">{workout}</td>
                    {filteredDates.map(date => {
                      const sessionsForDate = getSessionsByDate(date)
                      const hasWorkout = sessionsForDate.some(s => s.workouts.includes(workout))
                      return (
                        <td
                          key={`${workout}-${date}`}
                          className={`text-center p-2 border border-gray-200 ${
                            hasWorkout ? 'bg-purple-100' : ''
                          }`}
                        />
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedParticipants && selectedDate && (
          <ParticipantsModal
            participants={selectedParticipants}
            onClose={() => {
              setSelectedParticipants(null)
              setSelectedDate(null)
            }}
            date={selectedDate}
          />
        )}

      </div>
    </div>
  )
}
