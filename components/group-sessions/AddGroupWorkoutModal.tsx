'use client'

import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  open: boolean
  onClose: () => void
  onWorkoutAdded: () => void
}

export default function AddGroupWorkoutModal({ open, onClose, onWorkoutAdded }: Props) {
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>GROUP 세션 운동 추가</DialogTitle>
        </DialogHeader>

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

        <DialogFooter>
          <Button 
            variant="ghost"
            className="text-sm"
            onClick={onClose}
            disabled={loading}
          >
            닫기
          </Button>
          <Button
            onClick={handleAdd}
            disabled={loading}
            variant="darkGray" 
            className="text-sm"
          >
            {loading ? '저장 중...' : '저장'}
          </Button>
          {/* <Button
            onClick={handleAdd}
            disabled={loading}
            variant="save"
          >
            {loading ? '추가 중...' : '추가'}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            type="button"
            disabled={loading}
          >
            취소
          </Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
