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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-lg w-96">
        <h3 className="text-lg text-gray-700 font-semibold mb-4">운동 기록 추가</h3>
        <label className="block mb-2 text-gray-700">
          회원이름
          <input
            type="text"
            value={member.name}
            readOnly
            className="w-full border rounded px-2 py-1 bg-gray-100 text-gray-700 cursor-not-allowed"
          />
        </label>

        <label className="block mb-2 text-gray-700">
          부위 (Target)
          <input
            list="target-list"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full border rounded px-2 py-1"
            placeholder="예: Leg, Back, Chest"
            required
          />
          <datalist id="target-list">
            {existingTargets.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>

        <label className="block mb-2 text-gray-700">
          운동명 (Workout)
          <input
            type="text"
            value={workout}
            onChange={(e) => setWorkout(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </label>

        <label className="block mb-2 text-gray-700">
          횟수 (Reps)
          <input
            type="number"
            min={0}
            value={reps}
            onChange={(e) => setReps(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full border rounded px-2 py-1"
          />
        </label>

        <label className="block mb-2 text-gray-700">
          무게 (Weight, kg)
          <input
            type="number"
            min={0}
            value={weight}
            onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full border rounded px-2 py-1"
          />
        </label>

        <label className="block mb-4 text-gray-700">
          날짜 (Date)
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </label>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} className="text-gray-700">취소</Button>
          <Button type="submit" className="text-gray-700">저장</Button>
        </div>
      </form>
    </div>
  )
}
