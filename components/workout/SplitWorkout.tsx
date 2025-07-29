'use client'

import { useState, useEffect } from 'react'
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

interface SplitWorkoutProps {
  member: Member
  allTypes: WorkoutType[]
  onClose: () => void
}

export default function SplitWorkout({ member, allTypes, onClose }: SplitWorkoutProps) {
  const supabase = getSupabaseClient()

  const [numSplits, setNumSplits] = useState(3)
  const [splitNames, setSplitNames] = useState<string[]>(['A', 'B', 'C']) // 커스텀 헤더 이름
  const [selected, setSelected] = useState<Record<string, boolean[]>>({})
  const [initialSelected, setInitialSelected] = useState<Record<string, boolean[]>>({})

  // ✅ 초기 분할 불러오기
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase
        .from('split_workouts')
        .select('target, workout, split_index, split_name')
        .eq('member_id', member.member_id)

      const keySet = new Set(allTypes.map(t => `${t.target}||${t.workout}`))
      const initial: Record<string, boolean[]> = {}
      // const maxIndex = data?.reduce((max, d) => Math.max(max, d.split_index), 0) ?? 0
      const maxIndex = data && data.length > 0
        ? data.reduce((max, d) => Math.max(max, d.split_index), 0)
        : 1 // ← 최소 2분할로 시작


      keySet.forEach(key => {
        initial[key] = Array(maxIndex + 1).fill(false)
      })

      const names = Array(maxIndex + 1).fill('').map((_, i) => String.fromCharCode(65 + i)) // 기본 A, B, ...
      data?.forEach(({ target, workout, split_index, split_name }) => {
        const key = `${target}||${workout}`
        if (!initial[key]) initial[key] = Array(maxIndex + 1).fill(false)
        initial[key][split_index] = true
        if (split_name) names[split_index] = split_name
      })

      setNumSplits(maxIndex + 1)
      setSelected(initial)
      setSplitNames(names)
      setInitialSelected(initial)
    }

    init()
  }, [member.member_id, allTypes])

  // ✅ 분할 수 변경 시 초기화
  useEffect(() => {
    const uniqueKeys = Array.from(new Set(allTypes.map(t => `${t.target}||${t.workout}`)))
    const updated: Record<string, boolean[]> = {}
    uniqueKeys.forEach(key => {
      const prev = initialSelected[key] ?? []
      const newArr = Array(numSplits).fill(false).map((_, i) => prev[i] || false)
      updated[key] = newArr
    })
    setSelected(updated)

    // splitNames 동기화
    setSplitNames((prev) => {
      const newNames = [...prev]
      while (newNames.length < numSplits) {
        newNames.push(String.fromCharCode(65 + newNames.length))
      }
      return newNames.slice(0, numSplits)
    })
  }, [numSplits, allTypes, initialSelected])

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
      alert('기존 분할 삭제 실패: ' + error.message)
      return
    }

    if (payload.length > 0) {
      const { error: insertError } = await supabase
        .from('split_workouts')
        .insert(payload)

      if (insertError) {
        alert('저장 실패: ' + insertError.message)
      } else {
        alert('분할 저장이 완료되었습니다 😎')
        onClose()
      }
    } else {
      alert('저장할 분할이 없습니다 😥')
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="!max-w-[1000px] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">
            운동 분할 설정
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <label className="mr-2 font-medium">분할 수:</label>
          {[2, 3, 4, 5, 6].map(n => (
            <button
              key={n}
              onClick={() => setNumSplits(n)}
              className={`px-3 py-1 mx-1 rounded ${numSplits === n ? 'bg-gray-600 text-white' : 'bg-gray-200'}`}
            >
              {n}분할
            </button>
          ))}
        </div>

        <div className="overflow-y-auto max-h-[60vh] border rounded">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border text-left w-48">운동</th>
                {splitNames.map((name, i) => (
                  <th key={i} className="p-2 border">
                    <div className="flex justify-center items-center">
                      <Input
                        value={name}
                        onChange={(e) => handleNameChange(i, e.target.value)}
                        className="text-center text-sm w-16 text-black bg-white"
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
                      <td className="p-2 border whitespace-nowrap">{target} - {workout}</td>
                      {splitNames.map((_, idx) => (
                        <td key={idx} className="p-2 border text-center">
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