'use client'

import { useEffect, useState } from 'react'
import { NewWorkoutRecord, Member } from './types'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase'
import { Disclosure } from '@headlessui/react'
import { ChevronUpIcon } from '@heroicons/react/20/solid'

type Props = {
  member: Member
  onCancel: () => void
  onSave: (record: NewWorkoutRecord) => void
}

type WorkoutType = {
  workout_type_id: number
  target: string
  workout: string
  level: string
}

export default function AddRecordForm({ member, onCancel, onSave }: Props) {
  const [valueReps, setReps] = useState<number | ''>('')
  const [weight, setWeight] = useState<number | ''>('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [allTypes, setAllTypes] = useState<WorkoutType[]>([])
  const [selectedTarget, setSelectedTarget] = useState('')
  const [selectedWorkout, setSelectedWorkout] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newWorkout, setNewWorkout] = useState('')
  const [newLevel, setNewLevel] = useState('')
  const [loadingManage, setLoadingManage] = useState(false)

  const [openDisclosure, setOpenDisclosure] = useState(false)

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchTypes()
  }, [])

  useEffect(() => {
    if (openDisclosure) {
      fetchTypes()
    }
  }, [openDisclosure])

  const fetchTypes = async () => {
    const { data, error } = await supabase
      .from('workout_types')
      .select('*')
      .order('target', { ascending: true })
      .order('workout', { ascending: true })
    if (error) console.error('❌ 운동 항목 불러오기 실패:', error)
    else setAllTypes(data || [])
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTarget || !selectedWorkout || !date) {
      alert('모든 필드를 입력해주세요.')
      return
    }
    const record: NewWorkoutRecord = {
      member_id: member.member_id,
      target: selectedTarget,
      workout: selectedWorkout,
      reps: typeof valueReps === 'number' ? valueReps : 0,
      weight: typeof weight === 'number' ? weight : 0,
      workout_date: date,
    }
    onSave(record)
    setSelectedTarget('')
    setSelectedWorkout('')
    setReps('')
    setWeight('')
    setDate(new Date().toISOString().slice(0, 10))
    onCancel()
  }

  const handleAddType = async () => {
    if (!newTarget || !newWorkout || !newLevel) {
      alert('추가할 모든 항목을 입력하세요.')
      return
    }
    setLoadingManage(true)
    const { error } = await supabase
      .from('workout_types')
      .insert({ target: newTarget, workout: newWorkout, level: newLevel })
    setLoadingManage(false)
    if (error) alert('추가 실패: ' + error.message)
    else {
      await fetchTypes()
      setNewTarget('')
      setNewWorkout('')
      setNewLevel('')
    }
  }

  const handleDeleteType = async (id?: number) => {
    if (!id) return
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { error } = await supabase
      .from('workout_types')
      .delete()
      .eq('workout_type_id', id)
    if (error) alert('삭제 실패: ' + error.message)
    else fetchTypes()
  }

  const uniqueTargets = Array.from(new Set(allTypes.map((m) => m.target)))
  const workoutsForTarget = allTypes.filter((m) => m.target === selectedTarget)

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5 border-gray-200 border relative"
      >
        <h3 className="text-xl font-bold text-indigo-600 border-b pb-2">운동 기록 추가</h3>

        {/* 회원 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">회원 이름</label>
          <input
            type="text"
            value={member.name}
            readOnly
            className="w-full bg-gray-100 border rounded-lg px-3 py-2 text-gray-700 text-sm"
          />
        </div>

        {/* 분류 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">분류</label>
          <select
            value={selectedTarget}
            onChange={(e) => {
              setSelectedTarget(e.target.value)
              setSelectedWorkout('')
            }}
            className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">선택하세요</option>
            {uniqueTargets.map((target) => (
              <option key={target} value={target}>
                {target}
              </option>
            ))}
          </select>
        </div>

        {/* 항목 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">항목</label>
          <select
            value={selectedWorkout}
            onChange={(e) => setSelectedWorkout(e.target.value)}
            disabled={!selectedTarget}
            className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">선택하세요</option>
            {workoutsForTarget.map((m) => (
              <option key={m.workout_type_id} value={m.workout}>
                {m.workout}
              </option>
            ))}
          </select>
        </div>

        {/* reps / weight */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">횟수 (Reps)</label>
            <input
              type="number"
              placeholder="예: 10"
              min={0}
              className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
              value={valueReps}
              onChange={(e) => setReps(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">무게 (kg)</label>
            <input
              type="number"
              placeholder="예: 60"
              min={0}
              className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
              value={weight}
              onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>

        {/* 날짜 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">날짜</label>
          <input
            type="date"
            className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="text-sm">
            취소
          </Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
            저장
          </Button>
        </div>

        {/* 아코디언: 항목 관리 */}
        <Disclosure>
          {({ open }) => {
            useEffect(() => {
              setOpenDisclosure(open)
            }, [open])
            return (
              <>
                <Disclosure.Button className="flex w-full justify-between items-center mt-6 text-sm font-medium text-indigo-600 hover:underline">
                  <span>측정 항목 추가/삭제</span>
                  <ChevronUpIcon
                    className={`h-5 w-5 transform transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </Disclosure.Button>
                <Disclosure.Panel className="mt-2 bg-gray-50 border rounded-lg shadow-inner p-4 text-sm space-y-1 text-gray-700">
                  <div className="flex flex-wrap sm:flex-nowrap gap-2 items-end">
                    <input
                      type="text"
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                      placeholder="분류"
                      className="flex-grow min-w-[100px] border px-3 py-2 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      value={newWorkout}
                      onChange={(e) => setNewWorkout(e.target.value)}
                      placeholder="항목"
                      className="flex-grow min-w-[100px] border px-3 py-2 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value)}
                      placeholder="난이도"
                      className="w-20 border px-3 py-2 rounded-lg text-sm text-center"
                    />
                    <button
                      type="button"
                      onClick={handleAddType}
                      disabled={loadingManage}
                      className="text-indigo-500 hover:underline"
                    >
                      추가
                    </button>
                  </div>

                  <ul className="max-h-40 overflow-y-auto border-t pt-2 space-y-1">
                    {allTypes.map((m) => (
                      <li
                        key={m.workout_type_id}
                        className="flex justify-between items-center border-b py-1 text-gray-700"
                      >
                        <span>
                          {m.target} / {m.workout} / {m.level}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteType(m.workout_type_id)}
                          className="text-red-500 hover:underline"
                        >
                          삭제
                        </button>
                      </li>
                    ))}
                  </ul>
                </Disclosure.Panel>
              </>
            )
          }}
        </Disclosure>
      </form>
    </div>
  )
}
