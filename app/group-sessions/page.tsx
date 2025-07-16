'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { NotebookPen, CalendarPlus, CalendarCheck2, X, UserRoundSearch } from 'lucide-react'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import AddGroupSessionOpen from './AddGroupSessionOpen'  
import EditGroupSessionModal from './EditGroupSessionModal' 
import { useAuthGuard } from '@/hooks/useAuthGuard'

interface RawGroupSession {
  group_session_id: number;
  group_session_date: string;
  theme: string;
  trainer_id: number;
  trainer: {
    name: string | null;
  } | null;
  workouts: {
    workout_name: string;
  }[] | null;
  participants: {
    members: {
      name: string;
    } | null;
  }[] | null;
}

interface GroupSession {
  group_session_id: number;
  group_session_date: string;
  theme: string;
  trainer_id: number;
  trainer_name: string;
  workouts: string[];
  participants: string[];
}
  
export default function GroupSessionPage() {
  const supabase = getSupabaseClient() // 함수 외부에서 한 번만
  const [sessions, setSessions] = useState<GroupSession[]>([])
  const [keyword, setKeyword] = useState('')
  const router = useRouter()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<GroupSession | null>(null)

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

    const rawData = data as unknown as RawGroupSession[];

    const filtered = rawData.filter((session) =>
    session.workouts?.some((w) =>
        w.workout_name.toLowerCase().includes(keyword.toLowerCase())
    )
    );

    const transformed: GroupSession[] = filtered.map((session) => {
    const trainer = Array.isArray(session.trainer)
        ? session.trainer[0]
        : session.trainer;

    return {
        group_session_id: session.group_session_id,
        group_session_date: session.group_session_date,
        theme: session.theme,
        trainer_id: session.trainer_id,
        trainer_name: trainer?.name ?? '정보 없음',
        workouts: session.workouts?.map((w) => w.workout_name) ?? [],
        participants: session.participants?.map((p) => p.members?.name ?? '이름 없음') ?? [],
    };
    });

    setSessions(transformed)

  };
  
  useAuthGuard()

  useEffect(() => {
      fetchSessions()
  }, [])

  const handleSearch = async () => {
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
              members ( name, member_id )
            )
        `)
        .order('group_session_date', { ascending: false })

    if (error || !data) {
        console.error('검색 실패:', error)
        return
    }

    const rawData = data as unknown as RawGroupSession[]

    // 🔍 keyword로 참여자 이름 검색 (대소문자 무시)
    const filtered = rawData.filter((session) =>
        session.participants?.some((p) =>
            p.members?.name?.toLowerCase().includes(keyword.toLowerCase())
        )
    )

    const transformed: GroupSession[] = filtered.map((session) => {
        const trainer = Array.isArray(session.trainer)
            ? session.trainer[0]
            : session.trainer

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
  }

  const handleDelete = async (sessionId: number) => {
      const password = prompt('비밀번호를 입력하세요 🤐')
      if (password !== '2213') {
        alert('비밀번호가 일치하지 않습니다 ❌')
        return
      }
    
      const confirmDelete = confirm('정말로 이 세션을 삭제하시겠습니까?')
      if (!confirmDelete) return
    
      const { error } = await supabase
        .from('group_sessions')
        .delete()
        .eq('group_session_id', sessionId) // ✅ 수정됨
    
      if (error) {
        alert('세션 삭제 중 문제가 발생했어요 😥')
      } else {
        alert('세션 삭제를 완료하였습니다 🎉')
        fetchSessions()
      }
  }

  useEffect(() => {
      fetchSessions()
  }, [])

  return (
      <main className="flex min-h-screen flex-col p-6 bg-gray-50 overflow-auto">
        <div className="p-4 w-full max-w-screen-2xl mx-auto">
          <div className="flex flex-col items-center justify-center text-center bg-slate-50 py-8 px-4">
            <div className="text-center mb-6">
                <h1 className="text-3xl font-extrabold text-purple-600">그룹세션 관리</h1>
                <p className="text-sm text-gray-500 mt-2">그룹세션 일정을 확인하고 새로 등록해보세요</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center mb-6 space-y-2 sm:space-y-0 sm:space-x-3 w-full max-w-3xl">
              <div className="relative w-full sm:w-auto">
                <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch()
                    }}
                    placeholder="이름을 입력하세요"
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-black placeholder-gray-400"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              </div>

              <button
                onClick={handleSearch}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-full shadow-md transition flex justify-center items-center gap-1 text-sm"
              >
                <CalendarCheck2 size={20} /> 검색
              </button>
              <button
                onClick={() => setIsAddOpen(true)}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-full shadow-md transition flex justify-center items-center gap-1 text-sm"
              >
                <CalendarPlus size={20} /> 세션 추가
              </button>
              <button
                onClick={() => router.push('/members')}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-full shadow-md transition flex justify-center items-center gap-1 text-sm"
              >
                <UserRoundSearch size={20} /> 회원
              </button>
            </div>

            <ul className="space-y-3 w-full max-w-md">
              {sessions.map(session => (
                <li
                  key={session.group_session_id}
                  className="bg-white border border-purple-200 rounded-xl px-5 py-3 shadow-sm hover:shadow-md transition duration-300 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-left">
                    <h2 className="text-purple-800 font-semibold text-lg">
                      {dayjs(session.group_session_date).format('YYYY.MM.DD')} - {session.theme}
                    </h2>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      <div>트레이너: {session.trainer_name}</div>
                      <div>운동: {session.workouts.join(', ')}</div>
                      <div>참여자: {session.participants.join(', ')}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 sm:mt-0 sm:ml-4 justify-end">
                    <button
                      onClick={() => {
                        setSelectedSession(session)
                        setIsEditOpen(true)
                      }}
                      className="text-indigo-500 hover:text-indigo-700 transition text-sm"
                      title="세션 수정"
                    >
                      <NotebookPen size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(session.group_session_id)}
                      className="text-red-500 hover:text-red-700 transition text-sm"
                      title="세션 삭제"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {isAddOpen && (
              <AddGroupSessionOpen
                onClose={() => setIsAddOpen(false)}
                onSessionAdded={() => {
                  fetchSessions()
                  setIsAddOpen(false)
                }}
              />
            )}

            {isEditOpen && selectedSession && (
              <EditGroupSessionModal
                session={selectedSession}
                supabase={supabase}
                onClose={() => setIsEditOpen(false)}
                onUpdate={() => {
                  fetchSessions()
                  setIsEditOpen(false)
                }}
              />
            )}

          </div>
        </div>
      </main>
  )
}
