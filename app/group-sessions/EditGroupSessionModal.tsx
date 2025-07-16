'use client'

import { useState, useEffect } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import AddGroupWorkoutModal from './AddGroupWorkoutModal'  
import AddGroupThemeModal from './AddGroupThemeModal'  

type GroupSession = {
  group_session_id: number
  group_session_date: string
  theme: string
  trainer_id: number
  workouts: string[]
  participants: string[]
}

type Member = {
  member_id: number
  name: string
}

type Props = {
  session: GroupSession
  onClose: () => void
  onUpdate: () => void
  supabase: SupabaseClient
}

export default function EditGroupSessionModal({ session, onClose, onUpdate, supabase }: Props) {
  const [theme, setTheme] = useState(session.theme)
  const [date, setDate] = useState(session.group_session_date)
  const [trainerId, setTrainerId] = useState(session.trainer_id)
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>(session.workouts)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [trainers, setTrainers] = useState<Member[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [workouts, setWorkouts] = useState<string[]>([])
  const [showAddWorkout, setShowAddWorkout] = useState(false)
  const [showAddTheme, setShowAddTheme] = useState(false)
  const [groupThemes, setGroupThemes] = useState<{ theme_id: number; theme_name: string }[]>([])

  useEffect(() => {
    fetchWorkouts()
    fetchEligibleMembers()
    fetchTrainers()
    fetchGroupThemes()  
  }, [])
  

  useEffect(() => {
    // members가 로드된 후에 session.participants (이름 배열)로부터 member_id를 찾아 selectedMembers 세팅
    if (members.length > 0 && session.participants.length > 0) {
      const selectedIds = members
        .filter(m => session.participants.includes(m.name))
        .map(m => m.member_id.toString())
      setSelectedMembers(selectedIds)
    }
  }, [members, session.participants])
  
  const fetchWorkouts = async () => {
    const { data, error } = await supabase
      .from('workout_types')
      .select('workout')
      .eq('level', 'GROUP')
      .order('workout', { ascending: true })
  
    if (!error && data) {
      const uniqueWorkouts = Array.from(new Set(data.map(w => w.workout)))
      setWorkouts(uniqueWorkouts)
    } else {
      console.error('운동 종류 불러오기 실패:', error)
    }
  }
  
  const fetchEligibleMembers = async () => {
    const { data, error } = await supabase
      .from('member_packages')
      .select('member_id, members(name)')
      .eq('status', 'active')
      .gt('group_session_cnt', 0)
      .returns<{ member_id: number; members: { name: string } }[]>()
  
    if (!error && data) {
      const unique = new Map()
      data.forEach((d) => unique.set(d.member_id, d.members.name))
      setMembers([...unique.entries()].map(([id, name]) => ({ member_id: id, name })))
    } else {
      console.error('참여 가능한 회원 불러오기 실패:', error)
    }
  }
  
  const fetchTrainers = async () => {
    const { data, error } = await supabase
      .from('trainers')
      .select('trainer_id, name')
      .returns<{ trainer_id: number; name: string }[]>()
  
    if (!error && data) {
      const formatted = data.map(t => ({
        member_id: t.trainer_id,
        name: t.name,
      }))
      setTrainers(formatted)
  
      // 현재 선택된 트레이너가 없다면 기본값 설정
      if (!trainerId && formatted.length > 0) {
        setTrainerId(formatted[0].member_id)
      }
    } else {
      console.error('트레이너 목록 불러오기 실패:', error)
    }
  }

  const fetchGroupThemes = async () => {
    const { data, error } = await supabase
      .from('group_theme')
      .select('theme_id, theme_name')
      .order('theme_name', { ascending: true })
  
    if (!error && data) {
      setGroupThemes(data)
    } else {
      console.error('운동 테마 불러오기 실패:', error)
    }
  }

  const handleSubmit = async () => {
    if (!theme.trim() || !date || !trainerId) {
      setErrorMsg('필수 항목을 모두 입력해주세요')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      // 1) group_sessions 업데이트
      const { error: updateError } = await supabase
        .from('group_sessions')
        .update({ theme, group_session_date: date, trainer_id: trainerId })
        .eq('group_session_id', session.group_session_id)

      if (updateError) throw updateError

      // 2) 기존 workouts/participants 삭제 후 재삽입
      await supabase.from('group_session_workouts').delete().eq('group_session_id', session.group_session_id)
      await supabase.from('group_session_participants').delete().eq('group_session_id', session.group_session_id)

      const workoutInsert = selectedWorkouts.map(w => ({
        group_session_id: session.group_session_id,
        workout_name: w,
      }))
      const participantInsert = selectedMembers
        .map(mid => Number(mid))
        .filter(midNum => !isNaN(midNum))  // 숫자가 아닌 것은 걸러냄
        .map(midNum => ({
          group_session_id: session.group_session_id,
          member_id: midNum,
        }))

      if (workoutInsert.length > 0) {
        const { error: workoutErr } = await supabase.from('group_session_workouts').insert(workoutInsert)
        if (workoutErr) throw workoutErr
      }

      if (participantInsert.length > 0) {
        const { error: partErr } = await supabase.from('group_session_participants').insert(participantInsert)
        if (partErr) throw partErr
      }

      alert('그룹 세션을 성공적으로 수정했어요 ✅')
      onUpdate()
      onClose()
    } catch (err) {
      console.error(err)
      setErrorMsg('그룹 세션 수정 중 문제가 발생했어요 😥')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (
    item: string,
    arr: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const strItem = String(item)  
    if (arr.includes(strItem)) {
      setter(arr.filter(i => i !== strItem))
    } else {
      setter([...arr, strItem])
    }
  }
  

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-lg max-h-screen overflow-auto">
        <h2 className="flex justify-center items-center gap-2 text-xl font-semibold text-gray-800 mb-4">
          <Users size={20} /> 
          그룹 세션 수정
        </h2>

        {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}

        <div className="mb-4 flex flex-col md:flex-row gap-3">
          {/* 날짜 */}
          <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              />
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                운동 테마
              </label>
              <button
                type="button"
                onClick={() => setShowAddTheme(true)}
                className="text-purple-600 text-xs hover:underline"
              >
                + 테마 추가
              </button>
            </div>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="">테마 선택</option>
              {/* 현재 theme 값이 목록에 없으면 일단 보여주기 위함 */}
              {!groupThemes.some(t => t.theme_name === theme) && theme && (
                <option value={theme}>{theme} (존재하지 않음)</option>
              )}
              {groupThemes.map((t) => (
                <option key={t.theme_id} value={t.theme_name}>
                  {t.theme_name}
                </option>
              ))}
            </select>

          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">트레이너 선택</label>
            <select
              value={trainerId}
              onChange={(e) => setTrainerId(Number(e.target.value))}
              className="w-full p-2 border rounded text-sm"
            >
              {trainers.map(trainer => (
                <option key={trainer.member_id} value={trainer.member_id}>
                  {trainer.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="relative block text-sm font-medium text-gray-700 mb-1 h-6">
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
                운동 선택
            </span>    
            <button
                type="button"
                onClick={() => setShowAddWorkout(true)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-purple-600 text-sm hover:underline"
            >
                + 운동 추가
            </button>
          </label>  
          <div className="flex flex-wrap gap-2">
            {workouts.map((w) => (
              <button
                  key={w}
                  type="button"
                  onClick={() => toggleSelection(w, selectedWorkouts, setSelectedWorkouts)}
                  className={`px-3 py-1 rounded-full border text-sm transition ${
                    selectedWorkouts.includes(w) ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
              >
                  {w}
              </button>
            ))}
          </div>  
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">참여 회원</label>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.member_id}
                type="button"
                onClick={() => toggleSelection(m.member_id.toString(), selectedMembers, setSelectedMembers)}
                className={`px-3 py-1 rounded-full border text-sm transition ${
                  selectedMembers.includes(m.member_id.toString())
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            variant="outline"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition"
          >
            {loading ? '등록 중...' : '등록'}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            type="button"
            className="px-4 py-2 text-sm"
            disabled={loading}
          >
            취소
          </Button>
        </div>

        {showAddWorkout && (
          <AddGroupWorkoutModal
            onClose={() => setShowAddWorkout(false)}
            onWorkoutAdded={() => {
              fetchWorkouts()
              setShowAddWorkout(false)
            }}
          />
        )}
        {showAddTheme && (
          <AddGroupThemeModal
            onClose={() => setShowAddTheme(false)}
            onThemeAdded={() => {
              fetchGroupThemes()
              setShowAddTheme(false)
            }}
          />
        )}
      </div>
    </div>
  )
}