'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import AddGroupWorkoutModal from './AddGroupWorkoutModal' 
import AddGroupThemeModal from './AddGroupThemeModal'  
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

type Props = {
  open: boolean
  onClose: () => void
  onSessionAdded: () => void
}

type MemberOption = {
  id: number
  name: string
}

export default function AddGroupSessionDialog({ open, onClose, onSessionAdded }: Props) {
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
    if (open) {
      fetchWorkouts()
      fetchEligibleMembers()
      fetchTrainers()
      fetchGroupThemes()
    }
  }, [open])

  const fetchWorkouts = async () => {
    const { data, error } = await supabase.from('workout_types').select('workout').eq('level', 'GROUP')
    if (!error && data) setWorkouts([...new Set(data.map(w => w.workout))])
  }

  const fetchEligibleMembers = async () => {
    const { data } = await supabase
      .from('member_packages')
      .select('member_id, members(name)')
      .eq('status', 'active')
      .gt('group_session_cnt', 0)
      .returns<{ member_id: number; members: { name: string } }[]>()
    if (data) setMembers([...new Map(data.map(d => [d.member_id, d.members.name])).entries()].map(([id, name]) => ({ id, name })))
  }

  const fetchTrainers = async () => {
    const { data } = await supabase.from('trainers').select('trainer_id, name').returns<{ trainer_id: number; name: string }[]>()
    if (data) {
      const formatted = data.map(t => ({ id: t.trainer_id, name: t.name }))
      setTrainers(formatted)
      if (formatted.length > 0) setSelectedTrainerId(formatted[0].id)
    }
  }

  const fetchGroupThemes = async () => {
    const { data } = await supabase.from('group_theme').select('theme_id, theme_name').order('theme_name')
    if (data) setGroupThemes(data)
  }

  const handleSubmit = async () => {
    if (!theme.trim() || !date || selectedWorkouts.length === 0 || selectedMembers.length === 0) return setErrorMsg('모든 항목을 입력해주세요')
    setLoading(true)
    setErrorMsg('')
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('group_sessions')
        .insert([{ trainer_id: selectedTrainerId, group_session_date: date, theme }])
        .select('group_session_id')
        .single()
      if (sessionError) throw sessionError
      const groupSessionId = sessionData.group_session_id
      await supabase.from('group_session_workouts').insert(selectedWorkouts.map(w => ({ group_session_id: groupSessionId, workout_name: w })))
      await supabase.from('group_session_participants').insert(selectedMembers.map(m => ({ group_session_id: groupSessionId, member_id: Number(m) })))
      await supabase.from('pt_sessions').insert(selectedMembers.map(m => ({ member_id: Number(m), session_date: date, session_type: 'GROUP', created_at: new Date().toISOString() })))
      alert('그룹 세션 추가를 완료하였습니다 😎')
      onSessionAdded()
      onClose()
    } catch (err) {
      console.error(err)
      setErrorMsg('등록 중 오류 발생')
    } finally {
      setLoading(false)
    }
  }
  
  const toggleSelect = (value: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl"><Users size={20}/> 그룹 세션 추가</DialogTitle>
        </DialogHeader>

        {errorMsg && <p className="text-red-500 text-sm mb-3">{errorMsg}</p>}

        <div className="flex flex-col md:flex-row gap-3 mb-4 text-center">
          <div className="flex-1 flex flex-col items-center">
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full max-w-[200px] p-2 border rounded text-sm text-center"
            />
          </div>

          <div className="flex-1 flex flex-col items-center">
            <div className="relative mb-1 h-5 w-full text-center">
              <label className="text-sm font-medium">운동 테마</label>
              <button
                type="button"
                onClick={() => setShowAddTheme(true)}
                className="absolute right-0 text-gray-400 text-sm hover:underline"
              >
                + 추가
              </button>
            </div>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full max-w-[200px] p-2 border rounded text-sm text-center"
            >
              <option value="">테마 선택</option>
              {groupThemes.map((t) => (
                <option key={t.theme_id} value={t.theme_name}>
                  {t.theme_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 flex flex-col items-center">
            <label className="block text-sm font-medium text-gray-700 mb-1">트레이너 선택</label>
            <select
              value={selectedTrainerId ?? ''}
              onChange={(e) => setSelectedTrainerId(Number(e.target.value))}
              className="w-full max-w-[200px] p-2 border rounded text-sm text-center"
            >
              {trainers.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.name}
                </option>
              ))}
            </select>
          </div>
        </div>


        {/* 운동 선택 */}
        <div className="mb-4">
          <label className="relative block text-sm font-medium text-gray-700 mb-1 h-6">
            <span className="absolute left-1/2 -translate-x-1/2">운동 선택</span>
            <button onClick={() => setShowAddWorkout(true)} className="absolute right-0 text-gray-400 text-sm hover:underline">+ 운동 추가</button>
          </label>
          <div className="flex flex-wrap gap-2">
            {workouts.map(w => (
              <button key={w} type="button" onClick={() => toggleSelect(w, selectedWorkouts, setSelectedWorkouts)} className={`px-3 py-1 rounded-full border text-sm transition ${selectedWorkouts.includes(w) ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-800'}`}>{w}</button>
            ))}
          </div>
        </div>

        {/* 회원 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">참여 회원</label>
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <button key={m.id} type="button" onClick={() => toggleSelect(m.id.toString(), selectedMembers, setSelectedMembers)} className={`px-3 py-1 rounded-full border text-sm transition ${selectedMembers.includes(m.id.toString()) ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-800'}`}>{m.name}</button>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button onClick={handleSubmit} disabled={loading} variant="save" >{loading ? '등록 중...' : '등록'}</Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>취소</Button>
        </DialogFooter>

        {showAddWorkout && (
          <AddGroupWorkoutModal
            open={showAddWorkout}
            onClose={() => setShowAddWorkout(false)}
            onWorkoutAdded={() => {
              fetchWorkouts()
              setShowAddWorkout(false)
            }}
          />
        )}
        {showAddTheme && (
          <AddGroupThemeModal
            open={showAddTheme}
            onClose={() => setShowAddTheme(false)}
            onThemeAdded={() => {
              fetchGroupThemes()
              setShowAddTheme(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
