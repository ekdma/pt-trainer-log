'use client'

import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

type Props = {
  onClose: () => void
  onWorkoutAdded: () => void
}

export default function AddGroupWorkoutModal({ onClose, onWorkoutAdded }: Props) {
  const supabase = getSupabaseClient()
  const [target, setTarget] = useState('')
  const [workout, setWorkout] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleAdd = async () => {
    if (!target.trim() || !workout.trim()) {
      setErrorMsg('운동명과 타겟을 모두 입력해주세요')
      return
    }

    setLoading(true)
    setErrorMsg('')

    const { error } = await supabase.from('workout_types').insert({
      target,
      workout,
      level: 'GROUP',
      order_target: 0,
      order_workout: 0,
      created_dt: new Date().toISOString(),
    })

    if (error) {
      console.error(error)
      setErrorMsg('운동 추가에 실패했습니다')
    } else {
      onWorkoutAdded()
      onClose()
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
        <h3 className="text-lg font-bold mb-3">GROUP 세션 운동 추가</h3>
        {errorMsg && <p className="text-red-500 text-sm mb-2">{errorMsg}</p>}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">운동 타겟</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="예: Leg, Back"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">운동 이름</label>
          <input
            type="text"
            value={workout}
            onChange={(e) => setWorkout(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="예: Squat, Lunge"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button 
            onClick={handleAdd} 
            disabled={loading} 
            variant="outline"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition"
          >
            {loading ? '추가 중...' : '추가'}
          </Button>
          <Button 
            onClick={onClose} 
            variant="outline"
            type="button"
            className="px-4 py-2 text-sm"
            disabled={loading}>
            취소
          </Button>
        </div>
      </div>
    </div>
  )
}
