'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import AddGroupWorkoutModal from './AddGroupWorkoutModal' 
import AddGroupThemeModal from './AddGroupThemeModal'  

type Props = {
    onClose: () => void 
    onSessionAdded: () => void  
  }

  type MemberOption = {
    id: number
    name: string
  }

export default function AddGroupSessionOpen({ onClose, onSessionAdded }: Props) {
  const supabase = getSupabaseClient()

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [theme, setTheme] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [workouts, setWorkouts] = useState<string[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([])
  const [trainers, setTrainers] = useState<MemberOption[]>([])       // ① 트레이너 목록 상태
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(null)  // ② 선택된 트레이너
  const [showAddWorkout, setShowAddWorkout] = useState(false)
  const [groupThemes, setGroupThemes] = useState<{ theme_id: number; theme_name: string }[]>([])
  const [showAddTheme, setShowAddTheme] = useState(false)
  
  useEffect(() => {
    fetchWorkouts()
    fetchEligibleMembers()
    fetchTrainers()  
    fetchGroupThemes()
  }, [])

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

    if (!error) {
      const unique = new Map()
      data.forEach((d) => unique.set(d.member_id, d.members.name))
      setMembers([...unique.entries()].map(([id, name]) => ({ id, name })))
    }
  }

  const fetchTrainers = async () => {
    const { data, error } = await supabase
      .from('trainers')
      .select('trainer_id, name')
      .returns<{ trainer_id: number; name: string }[]>()  
  
    if (!error && data) {
      const formatted = data.map(t => ({
        id: t.trainer_id,
        name: t.name,
      }))
      setTrainers(formatted)
      if (formatted.length > 0) {
        setSelectedTrainerId(formatted[0].id)
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
    if (!theme.trim() || !date || selectedWorkouts.length === 0 || selectedMembers.length === 0) {
      setErrorMsg('모든 항목을 입력해주세요')
      return
    }
  
    const memberRaw = localStorage.getItem('litpt_member')
    if (!memberRaw) {
      setErrorMsg('로그인 정보가 없습니다.')
      return
    }
  
    try {
      const member = JSON.parse(memberRaw)
    } catch {
      setErrorMsg('로그인 정보가 올바르지 않습니다.')
      return
    }
  
    setLoading(true)
    setErrorMsg('')
  
    try {
      // 1) 그룹 세션 단위 삽입 (날짜+테마+트레이너)
      const { data: sessionData, error: sessionError } = await supabase
        .from('group_sessions')
        .insert([{ 
          trainer_id: selectedTrainerId, 
          group_session_date: date, 
          theme 
        }])
        .select('group_session_id')
        .single()
  
      if (sessionError) throw sessionError
  
      const groupSessionId = sessionData.group_session_id
  
      // 2) 운동들 삽입
      const { error: workoutsError } = await supabase
        .from('group_session_workouts')
        .insert(
          selectedWorkouts.map(workout => ({
            group_session_id: groupSessionId,
            workout_name: workout,
          }))
        )
      if (workoutsError) throw workoutsError
  
      // 3) 참가자들 삽입
      const { error: participantsError } = await supabase
        .from('group_session_participants')
        .insert(
          selectedMembers.map(memberId => ({
            group_session_id: groupSessionId,
            member_id: Number(memberId),
          }))
        )
      if (participantsError) throw participantsError

      // 4) PT 세션 이력 추가 (session_type = 'GROUP')
      const now = new Date().toISOString()
      const { error: ptInsertError } = await supabase
        .from('pt_sessions')
        .insert(
          selectedMembers.map(memberId => ({
            member_id: Number(memberId),
            session_date: date,         // 그룹 세션 날짜와 동일
            session_type: 'GROUP',
            created_at: now             // 현재 시간으로 기록
          }))
        )
      if (ptInsertError) throw ptInsertError
  
      alert('그룹 세션 추가를 완료하였습니다 😊')
      onSessionAdded()
      onClose()
  
    } catch (error) {
      console.error(error)
      setErrorMsg('등록 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }
  

  const toggleSelect = (
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(value)) {
      setList(list.filter((v) => v !== value))
    } else {
      setList([...list, value])
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-xl overflow-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-2">
            <Users size={20} /> 그룹 세션 추가
        </h2>

        {errorMsg && <p className="text-red-500 text-sm mb-3">{errorMsg}</p>}

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

          {/* 운동 테마 */}
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
              {groupThemes.map((t) => (
                <option key={t.theme_id} value={t.theme_name}>
                  {t.theme_name}
                </option>
              ))}
            </select>
          </div>

          {/* 트레이너 선택 */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">트레이너 선택</label>
            <select
              value={selectedTrainerId ?? ''}
              onChange={(e) => setSelectedTrainerId(Number(e.target.value))}
              className="w-full p-2 border rounded text-sm"
            >
              {trainers.map(trainer => (
                  <option key={trainer.id} value={trainer.id}>
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
                  onClick={() => toggleSelect(w, selectedWorkouts, setSelectedWorkouts)}
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
                key={m.id}
                type="button"
                onClick={() => toggleSelect(m.id.toString(), selectedMembers, setSelectedMembers)}
                className={`px-3 py-1 rounded-full border text-sm transition ${
                selectedMembers.includes(m.id.toString()) ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-800'
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
