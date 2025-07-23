// page.tsx
'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import TrainerHeader from '@/components/layout/TrainerHeader'
import AddGroupSessionOpen from '@/components/group-sessions/AddGroupSessionOpen'
import EditGroupSessionModal from '@/components/group-sessions/EditGroupSessionModal'
import ViewTotalGroupSessionModal from '@/components/group-sessions/ViewTotalGroupSessionModal'
import GroupSessionSearch from '@/components/group-sessions/GroupSessionSearch'
import { RawGroupSession, GroupSession } from '@/types/groupSessionTypes'
import {
  CalendarSearch,
  CalendarPlus,
  CalendarFold,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GroupSessionPage() {
  const supabase = getSupabaseClient()
  const [sessions, setSessions] = useState<GroupSession[]>([])
  const [keyword, setKeyword] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<GroupSession | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [allSessions, setAllSessions] = useState<GroupSession[]>([]) // ✅ 원본 전체 세션

  useAuthGuard()

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('group_sessions')
      .select(`
        group_session_id,
        group_session_date,
        theme,
        trainer_id,
        trainer:trainers!fk_trainer ( name ),
        workouts:group_session_workouts ( workout_name ),
        participants:group_session_participants (
          members ( name )
        )
      `)
      .order('group_session_date', { ascending: false })

    if (error || !data) {
      console.error('세션 로딩 실패:', error)
      return
    }

    const rawData = data as unknown as RawGroupSession[]
    const transformed = rawData.map((session) => {
      const trainer = Array.isArray(session.trainer) ? session.trainer[0] : session.trainer

      return {
        group_session_id: session.group_session_id,
        group_session_date: session.group_session_date,
        theme: session.theme,
        trainer_id: session.trainer_id,
        trainer_name: trainer?.name ?? '정보 없음',
        workouts: session.workouts?.map((w) => w.workout_name) ?? [],
        participants: session.participants?.map((p) => p.members?.name ?? '이름 없음') ?? [],
      }
    })

    setSessions(transformed)
    setAllSessions(transformed)
    setSessions(filterSessionsByKeyword(keyword, transformed))

  }

  const filterSessionsByKeyword = (keyword: string, allSessions: GroupSession[]) => {
    const trimmed = keyword.trim().toLowerCase();
    if (!trimmed) return allSessions;
  
    return allSessions.filter((session) =>
      session.participants.some((name) => name.toLowerCase().includes(trimmed))
    );
  };
  

  useEffect(() => {
    fetchSessions()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <TrainerHeader />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 w-full">
          {/* 좌측: 제목 */}
          <h2 className="text-lg font-semibold text-gray-800">그룹세션 관리</h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* 검색창 */}
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSessions(filterSessionsByKeyword(keyword, allSessions)) // ✅
                  }
                }}
                placeholder="이름을 입력하세요"
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 text-black placeholder-gray-400"
              />
              <span className="absolute left-3 top-2.5 text-gray-400"><Search size={18} /> </span>
            </div>

            {/* 버튼들 */}
            <Button
              onClick={() => setSessions(filterSessionsByKeyword(keyword, allSessions))}
              variant="click"
              className="text-sm"
            >
              <CalendarSearch size={20} /> 검색
            </Button>
            <Button
              onClick={() => setIsAddOpen(true)}
              variant="click"
              className="text-sm"
            >
              <CalendarPlus size={20} /> 세션 추가
            </Button>
            <Button
              onClick={() => setShowAll(!showAll)}
              variant="click"
              className="text-sm"
            >
              <CalendarFold size={20} /> 전체보기
            </Button>
          </div>
        </div>


        {/* ✅ 목록 전용 컴포넌트 */}
        <GroupSessionSearch
          sessions={sessions}
          setSessions={setSessions}
          fetchSessions={fetchSessions}
          setSelectedSession={setSelectedSession}
          setIsEditOpen={setIsEditOpen}
        />
      </main>
        {/* 모달들 */}
        {isAddOpen && (
          <AddGroupSessionOpen
            open={isAddOpen}
            onClose={() => setIsAddOpen(false)}
            onSessionAdded={() => {
              fetchSessions()
              setIsAddOpen(false)
            }}
          />
        )}

        {isEditOpen && selectedSession && (
          <EditGroupSessionModal
            open={isEditOpen}
            session={selectedSession}
            supabase={supabase}
            onClose={() => setIsEditOpen(false)}
            onUpdate={() => {
              fetchSessions()
              setIsEditOpen(false)
            }}
          />
        )}

        {showAll && <ViewTotalGroupSessionModal onClose={() => setShowAll(false)} />}
    </div>
  )
}
