'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

type Member = {
  member_id: number
  name: string
  // 추가 필드
}

type WorkoutRecord = {
  workout_id: number
  member_id: number
  target: string
  workout: string
  reps: number
  weight: number
  workout_date: string
}

interface WorkoutLogManagerProps {
  member: Member
  logs: WorkoutRecord[]
  onClose?: () => void
  onUpdateLogs?: (updatedLogs: WorkoutRecord[]) => void
}

export default function WorkoutLogManager({
    member,
    // logs,
    onClose,
    onUpdateLogs,
}: WorkoutLogManagerProps) {
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutRecord[]>([])
  const [newLog, setNewLog] = useState<Partial<WorkoutRecord>>({
    member_id: member.member_id,
  })
  const supabase = getSupabaseClient()

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('workout_logs')
      .select(`
        workout_id,
        member_id,
        target,
        workout,
        reps,
        weight,
        workout_date,
        members!inner(name)
        `)
      .order('workout_date')
      .eq('member_id', member.member_id)
      .order('workout_date', { ascending: true })
      .order('target', { ascending: true })
      .order('workout', { ascending: true })
  
    if (error) {
      alert('불러오기 오류: ' + error.message)
      return []
    } else {
      setWorkoutLogs(data ?? [])
      return data ?? []
    }
  }  

  useEffect(() => {
    fetchLogs()
  }, [member.member_id])

  const handleUpdate = async (log: WorkoutRecord) => {
    const { error } = await supabase.from('workout_logs').update(log).eq('workout_id', log.workout_id)
    if (error) alert('수정 오류: ' + error.message)
    else {
      const updated = await fetchLogs()
      if (onUpdateLogs) {
        onUpdateLogs(updated)
      }
      alert('기록 수정을 완료하였습니다 😊')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { error } = await supabase.from('workout_logs').delete().eq('workout_id', id)
    if (error) alert('삭제 오류: ' + error.message)
    else {
      const updated = await fetchLogs()
      if (onUpdateLogs) {
        onUpdateLogs(updated)
      }
      alert('기록 삭제를 완료하였습니다 😊')
    }
  }
  
  const handleInsert = async () => {
    if (
      newLog.member_id === undefined ||
      newLog.member_id === null ||
      !newLog.target ||
      !newLog.workout ||
      !newLog.workout_date
    ) {
      alert('모든 필드를 입력하세요')
      return
    }
  
    const { error } = await supabase.from('workout_logs').insert(newLog)
    if (error) alert('추가 오류: ' + error.message)
    else {
      setNewLog({ member_id: member.member_id })
      const updated = await fetchLogs()
      if (onUpdateLogs) {
        onUpdateLogs(updated)
      }
      alert('기록 저장을 완료하였습니다 😊')
    }
  }
  
  const handleChange = (id: number, field: keyof WorkoutRecord, value: string | number) => {
    setWorkoutLogs((prev) =>
      prev.map((log) => (log.workout_id === id ? { ...log, [field]: value } : log))
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="absolute inset-0" onClick={onClose}></div>

        <div
            className="relative bg-white rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] overflow-auto p-6 text-gray-700"
            onClick={(e) => e.stopPropagation()}
        >
            <h2 className="text-xl font-bold text-gray-700 mb-4">운동 기록 관리</h2>

            <table className="w-full table-fixed border text-sm text-gray-600">
            <thead>
                <tr className="bg-gray-100 text-gray-700">
                <th className="border px-2 py-1">날짜</th>
                <th className="border px-2 py-1">회원명</th>
                <th className="border px-2 py-1">분류</th>
                <th className="border px-2 py-1">항목</th>
                <th className="border px-2 py-1">Reps</th>
                <th className="border px-2 py-1">Weight</th>
                <th className="border px-2 py-1">동작</th>
                </tr>
            </thead>
            <tbody>
                {workoutLogs.map((log) => (
                <tr key={log.workout_id} className="text-gray-700">
                    <td className="border px-2 py-1">
                    <input
                        type="date"
                        value={log.workout_date}
                        onChange={(e) => handleChange(log.workout_id, 'workout_date', e.target.value)}
                        className="w-full text-gray-700"
                    />
                    </td>
                    <td className="border px-2 py-1">{member.name}</td>
                    <td className="border px-2 py-1">
                    <input
                        type="text"
                        value={log.target}
                        onChange={(e) => handleChange(log.workout_id, 'target', e.target.value)}
                        className="w-full text-gray-700"
                    />
                    </td>
                    <td className="border px-2 py-1">
                    <input
                        type="text"
                        value={log.workout}
                        onChange={(e) => handleChange(log.workout_id, 'workout', e.target.value)}
                        className="w-full text-gray-700"
                    />
                    </td>
                    <td className="border px-2 py-1">
                    <input
                        type="number"
                        value={log.reps}
                        onChange={(e) => handleChange(log.workout_id, 'reps', Number(e.target.value))}
                        className="w-full text-gray-700"
                    />
                    </td>
                    <td className="border px-2 py-1">
                    <input
                        type="number"
                        value={log.weight}
                        onChange={(e) => handleChange(log.workout_id, 'weight', Number(e.target.value))}
                        className="w-full text-gray-700"
                    />
                    </td>
                    <td className="border px-2 py-1 flex gap-2 justify-center">
                    <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 text-sm" onClick={() => handleUpdate(log)}>
                        저장
                    </Button>
                    <Button size="sm" variant="destructive" className="bg-red-600 text-white hover:bg-red-700 text-sm" onClick={() => handleDelete(log.workout_id)}>
                        삭제
                    </Button>
                    </td>
                </tr>
                ))}
                <tr className="bg-gray-50 text-gray-700">
                <td className="border px-2 py-1">
                    <input
                    type="date"
                    value={newLog.workout_date || ''}
                    onChange={(e) => setNewLog({ ...newLog, workout_date: e.target.value })}
                    className="w-full text-gray-700"
                    />
                </td>
                <td className="border px-2 py-1">{member.name}</td>
                <td className="border px-2 py-1">
                    <input
                    type="text"
                    value={newLog.target || ''}
                    onChange={(e) => setNewLog({ ...newLog, target: e.target.value })}
                    className="w-full text-gray-700"
                    />
                </td>
                <td className="border px-2 py-1">
                    <input
                    type="text"
                    value={newLog.workout || ''}
                    onChange={(e) => setNewLog({ ...newLog, workout: e.target.value })}
                    className="w-full text-gray-700"
                    />
                </td>
                <td className="border px-2 py-1">
                    <input
                    type="number"
                    value={newLog.reps || ''}
                    onChange={(e) => setNewLog({ ...newLog, reps: Number(e.target.value) })}
                    className="w-full text-gray-700"
                    />
                </td>
                <td className="border px-2 py-1">
                    <input
                    type="number"
                    value={newLog.weight || ''}
                    onChange={(e) => setNewLog({ ...newLog, weight: Number(e.target.value) })}
                    className="w-full text-gray-700"
                    />
                </td>
                <td className="border px-2 py-1 text-center">
                    <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 text-sm" onClick={handleInsert}>
                    추가
                    </Button>
                </td>
                </tr>
            </tbody>
            </table>

            <div className="mt-4 text-right">
            <button
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                onClick={onClose}
            >
                닫기
            </button>
            </div>
        </div>
        </div>

  )
}