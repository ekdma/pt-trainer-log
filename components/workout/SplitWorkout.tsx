'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import type { WorkoutType, Member } from '@/components/members/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface SplitWorkoutProps {
  member: Member
  allTypes: WorkoutType[]
  onClose: () => void
}

type SplitWorkoutRow = {
  target: string
  workout: string
  split_index: number
  split_name: string | null
}


export default function SplitWorkout({ member, allTypes, onClose }: SplitWorkoutProps) {
  const supabase = getSupabaseClient()

  const [numSplits, setNumSplits] = useState(3)
  const [splitNames, setSplitNames] = useState<string[]>(['A', 'B', 'C']) // 커스텀 헤더 이름
  const [selected, setSelected] = useState<Record<string, boolean[]>>({})
  // const [initialSelected, setInitialSelected] = useState<Record<string, boolean[]>>({})

  const initializedRef = useRef(false)
  const isHydratingRef = useRef(true)


  // ✅ 초기 분할 불러오기
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase
        .from('split_workouts')
        .select('target, workout, split_index, split_name')
        .eq('member_id', member.member_id)

      const keySet = new Set<string>()

      // allTypes 기준
      allTypes.forEach(t => {
        keySet.add(`${t.target}||${t.workout}`)
      })

      const rows = (data ?? []) as SplitWorkoutRow[]
      
      // DB 기준 (⭐️ 이게 핵심)
      rows.forEach(({ target, workout }) => {
        keySet.add(`${target}||${workout}`)
      })

      const initial: Record<string, boolean[]> = {}


      const maxIndex =
        rows.length > 0
          ? rows.reduce(
              (max: number, d: SplitWorkoutRow) =>
                Math.max(max, d.split_index),
              0
            )
          : 1


      keySet.forEach(key => {
        if (!initial[key]) {
          initial[key] = Array(maxIndex + 1).fill(false)
        }
      })


      const names = Array(maxIndex + 1)
        .fill('')
        .map((_, i) => String.fromCharCode(65 + i))

      rows.forEach(({ target, workout, split_index, split_name }) => {
        const key = `${target}||${workout}`

        // 🔥 핵심 방어 코드
        if (!initial[key]) {
          initial[key] = Array(maxIndex + 1).fill(false)
        }

        initial[key][split_index] = true

        if (split_name) {
          names[split_index] = split_name
        }
      })


      // ✅ 모든 초기 상태를 최초 1회만 세팅
      if (!initializedRef.current) {
        setNumSplits(maxIndex + 1)
        setSplitNames(names)
        setSelected(initial)
        // setInitialSelected(initial)
        initializedRef.current = true
        isHydratingRef.current = false
      }
    }

    init()
  }, [member.member_id, allTypes])



  // ✅ 분할 수 변경 시 초기화
  useEffect(() => {
    if (isHydratingRef.current) return
    
    setSelected(prevSelected => {
      const updated: Record<string, boolean[]> = {}

      const keys = Array.from(
        new Set(allTypes.map(t => `${t.target}||${t.workout}`))
      )

      keys.forEach(key => {
        const prev = prevSelected[key] ?? []
        const next = Array(numSplits).fill(false)

        for (let i = 0; i < Math.min(prev.length, numSplits); i++) {
          next[i] = prev[i]
        }

        updated[key] = next
      })

      return updated
    })

    // splitNames 동기화
    setSplitNames(prev => {
      const next = [...prev]
      while (next.length < numSplits) {
        next.push(String.fromCharCode(65 + next.length))
      }
      return next.slice(0, numSplits)
    })
  }, [numSplits]) // 🔥 allTypes / initialSelected 제거


  const handleToggle = (key: string, index: number) => {
    setSelected(prev => {
      const updated = [...(prev[key] || [])]
      updated[index] = !updated[index]
      return { ...prev, [key]: updated }
    })
  }

  const handleNameChange = (index: number, val: string) => {
    const updated = [...splitNames]
    updated[index] = val
    setSplitNames(updated)
  }

  const handleSave = async () => {
    const payload = Object.entries(selected).flatMap(([key, values]) => {
      const [target, workout] = key.split('||')
      return values.map((checked, index) =>
        checked
          ? {
              member_id: member.member_id,
              split_index: index,
              split_name: splitNames[index] || String.fromCharCode(65 + index),
              target,
              workout,
            }
          : null
      ).filter(Boolean)
    })

    // 기존 삭제
    const { error } = await supabase
      .from('split_workouts')
      .delete()
      .eq('member_id', member.member_id)

    if (error) {
      // alert('기존 분할 삭제 실패: ' + error.message)
      toast.error('기존 분할 삭제 실패: ' + error.message)
      return
    }

    if (payload.length > 0) {
      const { error: insertError } = await supabase
        .from('split_workouts')
        .insert(payload)

      if (insertError) {
        // alert('저장 실패: ' + insertError.message)
        toast.error('저장 실패: ' + insertError.message)
      } else {
        // alert('분할 저장이 완료되었습니다 😎')
        toast.success('분할 저장이 완료되었습니다 😎')
        onClose()
      }
    } else {
      // alert('저장할 분할이 없습니다 😥')
      toast.error('저장할 분할이 없습니다 😥')
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="
        !max-w-[1100px]
        w-full
        max-h-[90vh]
        overflow-y-auto
        rounded-2xl
        p-6
      ">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">
            운동 분할 설정
          </DialogTitle>
        </DialogHeader>

        <div className="inline-flex rounded-lg border bg-gray-50 p-1">
          {[2, 3, 4, 5, 6].map(n => (
            <button
              key={n}
              onClick={() => setNumSplits(n)}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-md transition
                ${numSplits === n
                  ? 'bg-gray-700 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-200'}
              `}
            >
              {n}분할
            </button>
          ))}
        </div>

        <div className="overflow-y-auto max-h-[60vh] border rounded">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border text-center w-48">운동</th>
                {splitNames.map((name, i) => (
                  <th key={i} className="p-2 border bg-gray-50">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500">
                        Split {i + 1}
                      </span>
                      <Input
                        value={name}
                        onChange={(e) => handleNameChange(i, e.target.value)}
                        className="text-center text-sm w-20 font-semibold bg-white"
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(new Set(allTypes.map(t => `${t.target}||${t.workout}`)))
                .sort((a, b) => {
                  const [targetA, workoutA] = a.split('||')
                  const [targetB, workoutB] = b.split('||')
                  if (targetA < targetB) return -1
                  if (targetA > targetB) return 1
                  if (workoutA < workoutB) return -1
                  if (workoutA > workoutB) return 1
                  return 0
                })
                .map((key, i) => {
                  const [target, workout] = key.split('||')
                  return (
                    <tr key={i}>
                      <td className="p-2 border">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-700">
                            {target}
                          </span>
                          <span className="font-medium text-gray-800">
                            {workout}
                          </span>
                        </div>
                      </td>
                      
                      {splitNames.map((_, idx) => (
                        <td
                          key={idx}
                          className={`
                            p-2 border text-center transition
                            ${selected[key]?.[idx]
                              ? 'bg-gray-100'
                              : 'hover:bg-gray-50'}
                          `}
                        >
                          <Checkbox
                            checked={selected[key]?.[idx] || false}
                            onCheckedChange={() => handleToggle(key, idx)}
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-6 gap-2">
          <Button 
            variant="ghost"
            className="text-sm"
            onClick={onClose}
          >
            닫기
          </Button>
          <Button
            onClick={handleSave}
            variant="darkGray" 
            className="text-sm"
          >
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}