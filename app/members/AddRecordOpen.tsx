'use client'

import { useState } from 'react'
import { NewWorkoutRecord, Member } from './types'
import { Button } from '@/components/ui/button'

type Props = {
  member: Member
  existingTargets: string[]
  onCancel: () => void
  onSave: (record: NewWorkoutRecord) => void
}

export default function AddRecordForm({ member, existingTargets, onCancel, onSave }: Props) {
  const [target, setTarget] = useState('')
  const [workout, setWorkout] = useState('')
  const [reps, setReps] = useState<number | ''>('')
  const [weight, setWeight] = useState<number | ''>('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)) // YYYY-MM-DD

  function handleSubmit(e: React.FormEvent) {
    
    e.preventDefault()
    if (!target || !workout || !date) {
      alert('부위, 운동명, 날짜는 필수입니다.')
      return
    }

    const record: NewWorkoutRecord = {
      member_id: member.member_id,
      target,
      workout,
      reps: typeof reps === 'number' ? reps : 0,
      weight: typeof weight === 'number' ? weight : 0,
      workout_date: date,
    }
  
    console.log('📤 저장할 기록:', record)

    // 부모에 전달 (DB 저장은 부모가 처리)
    onSave({
      member_id: member.member_id,
      target,
      workout,
      reps: typeof reps === 'number' ? reps : 0,
      weight: typeof weight === 'number' ? weight : 0,
      workout_date: date,
    })

    // 폼 초기화
    setTarget('')
    setWorkout('')
    setReps('')
    setWeight('')
    setDate(new Date().toISOString().slice(0, 10))

    // 모달 닫기
    onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5 border border-gray-100"
      >
        <h3 className="text-xl font-bold text-indigo-600 border-b pb-2">운동 기록 추가</h3>

        {/* 이름 표시 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">회원 이름</label>
          <input
            type="text"
            value={member.name}
            readOnly
            className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-700 cursor-not-allowed"
          />
        </div>

        {/* 부위 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">운동 부위</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="예: Leg, Back, Chest"
            className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* 운동명 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">운동명</label>
          <input
            type="text"
            value={workout}
            onChange={(e) => setWorkout(e.target.value)}
            placeholder="예: Squat, Lunge"
            className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          />
        </div>

        {/* 횟수 */}
        <div className="flex gap-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-600 mb-1">횟수 (Reps)</label>
            <input
              type="number"
              min={0}
              value={reps}
              onChange={(e) => setReps(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="예: 10"
              className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* 무게 */}
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-600 mb-1">무게 (kg)</label>
            <input
              type="number"
              min={0}
              value={weight}
              onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="예: 60"
              className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {/* 날짜 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="text-gray-700">
            취소
          </Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
            저장
          </Button>
        </div>
      </form>
    </div>

  )
}
