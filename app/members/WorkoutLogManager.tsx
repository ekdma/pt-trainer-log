'use client'

import { Plus} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

type Member = {
  member_id: number
  name: string
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

type InsertLog = {
  member_id: string | number;
  target: string;
  workout: string;
  workout_date: string;
  reps: number;
  weight: number;
}

type UpdateLog = {
  id: string | number;
  weight: number;
}

export default function WorkoutLogManager({
  member,
  onClose,
  onUpdateLogs,
}: WorkoutLogManagerProps) {
  // const [workoutLogs, setWorkoutLogs] = useState<WorkoutRecord[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [rows, setRows] = useState<{ target: string; workout: string }[]>([])
  const [logMap, setLogMap] = useState<Record<string, Record<string, { weight: number; id?: number }>>>({})
  const [addingDate, setAddingDate] = useState<string | null>(null)
  const [newLogInputs, setNewLogInputs] = useState<Record<string, { weight: string }>>({})
  const [addingRow, setAddingRow] = useState(false)
  const [newTarget, setNewTarget] = useState('')
  const [newWorkout, setNewWorkout] = useState('')
  const [newWorkoutInputs, setNewWorkoutInputs] = useState<Record<string, { weight: string }>>({})
  const [modifiedCells, setModifiedCells] = useState<{ rowKey: string; date: string; weight: number; id?: number }[]>([])
  const hasModifiedCells = modifiedCells.length > 0
  const hasNewLogInputs = addingDate !== null && Object.values(newLogInputs).some(input => Number(input.weight) > 0)
  const hasNewWorkoutInputs = addingRow && Object.values(newWorkoutInputs).some(input => Number(input.weight) > 0)
  const canSave = hasModifiedCells || hasNewLogInputs || hasNewWorkoutInputs
  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchLogs()
  }, [member.member_id])

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('member_id', member.member_id)
  
    if (error) {
      alert('불러오기 오류: ' + error.message)
      return
    }
  
    const logs = data ?? []
    // setWorkoutLogs(logs)
    if (onUpdateLogs) onUpdateLogs(logs)   // ★ 여기 추가 ★

    const uniqueDates = Array.from(new Set(logs.map(l => l.workout_date))).sort()
    const uniqueRows = Array.from(
      new Set(logs.map(l => `${l.target}||${l.workout}`))
    )
      .map(row => {
        const [target, workout] = row.split('||')
        return { target, workout }
      })
      .sort((a, b) => {
        if (a.target === b.target) {
          return a.workout.localeCompare(b.workout)
        }
        return a.target.localeCompare(b.target)
      })

    const newLogMap: typeof logMap = {}
    logs.forEach(l => {
      const rowKey = `${l.target}||${l.workout}`
      if (!newLogMap[rowKey]) newLogMap[rowKey] = {}
      newLogMap[rowKey][l.workout_date] = {
        weight: l.weight,
        id: l.workout_id,
      }
    })

    setDates(uniqueDates)
    setRows(uniqueRows)
    setLogMap(newLogMap)
  }

  // const handleUpdate = async (
  //   rowKey: string,
  //   date: string,
  //   value: number
  // ) => {
  //   const [target, workout] = rowKey.split('||')
  //   const entry = logMap[rowKey]?.[date] || {}
  //   const id = entry.id

  //   if (id) {
  //     const { error } = await supabase
  //       .from('workout_logs')
  //       .update({ weight: value })
  //       .eq('workout_id', id)
  //     if (error) alert('업데이트 오류: ' + error.message)
  //   } else {
  //     const insertData = {
  //       member_id: member.member_id,
  //       target,
  //       workout,
  //       workout_date: date,
  //       reps: 0,
  //       weight: value,
  //     }
  //     const { error } = await supabase.from('workout_logs').insert(insertData)
  //     if (error) alert('삽입 오류: ' + error.message)
  //   }

  //   fetchLogs()
  // }

  const startAddingDate = () => {
    if (addingDate !== null) return
    setAddingDate('')
    setNewLogInputs({})
  }

  // const saveNewDateAndLogs = async () => {
  //   if (!addingDate) {
  //     alert('날짜를 입력해주세요')
  //     return
  //   }
  //   if (dates.includes(addingDate)) {
  //     alert('이미 존재하는 날짜입니다.')
  //     return
  //   }

  //   const inserts: any[] = []
  //   for (const row of rows) {
  //     const key = `${row.target}||${row.workout}`
  //     const input = newLogInputs[key]
  //     if (input) {
  //       const weightNum = Number(input.weight)
  //       if (weightNum > 0) {
  //         inserts.push({
  //           member_id: member.member_id,
  //           target: row.target,
  //           workout: row.workout,
  //           workout_date: addingDate,
  //           reps: 0,
  //           weight: weightNum,
  //         })
  //       }
  //     }
  //   }

  //   if (inserts.length === 0) {
  //     alert('적어도 하나 이상의 weight를 입력해주세요 😎')
  //     return
  //   }

  //   const { error } = await supabase.from('workout_logs').insert(inserts)
  //   if (error) {
  //     alert('삽입 오류: ' + error.message)
  //     return
  //   }

  //   setDates(prev => [...prev, addingDate].sort())
  //   setAddingDate(null)
  //   setNewLogInputs({})
  //   fetchLogs()
  // }

  const cancelAddingDate = () => {
    setAddingDate(null)
    setNewLogInputs({})
  }

  const handleNewLogInputChange = (rowKey: string, value: string) => {
    setNewLogInputs(prev => ({
      ...prev,
      [rowKey]: { weight: value },
    }))
  }

  const startAddingRow = () => {
    setAddingRow(true)
    setNewTarget('')
    setNewWorkout('')
    setNewWorkoutInputs({})
  }

  const handleNewWorkoutInputChange = (date: string, value: string) => {
    setNewWorkoutInputs(prev => ({
      ...prev,
      [date]: { weight: value },
    }))
  }

  // const saveNewWorkout = async () => {
  //   if (!newTarget.trim() || !newWorkout.trim()) {
  //     alert('운동 부위와 운동 이름을 입력해주세요.')
  //     return
  //   }

  //   const inserts = []
  //   for (const date of dates) {
  //     const inputs = newWorkoutInputs[date]
  //     if (!inputs) continue
  //     const weightNum = Number(inputs.weight)
  //     if (weightNum > 0) {
  //       inserts.push({
  //         member_id: member.member_id,
  //         target: newTarget.trim(),
  //         workout: newWorkout.trim(),
  //         workout_date: date,
  //         reps: 0,
  //         weight: weightNum,
  //       })
  //     }
  //   }

  //   if (inserts.length === 0) {
  //     alert('적어도 하나 이상의 weight를 입력해주세요 😎')
  //     return
  //   }

  //   const { error } = await supabase.from('workout_logs').insert(inserts)
  //   if (error) {
  //     alert('삽입 오류: ' + error.message)
  //     return
  //   }

  //   setAddingRow(false)
  //   setNewTarget('')
  //   setNewWorkout('')
  //   setNewWorkoutInputs({})
  //   fetchLogs()
  // }

  const cancelAddingRow = () => {
    setAddingRow(false)
    setNewTarget('')
    setNewWorkout('')
    setNewWorkoutInputs({})
  }

  const handleCellChange = (rowKey: string, date: string, value: number | string) => {
    const weight = Number(value)
    const parsedWeight = isNaN(weight) ? null : weight
  
    setLogMap(prev => {
      const updated = { ...prev }
      if (!updated[rowKey]) updated[rowKey] = {}
      updated[rowKey][date] = {
        ...updated[rowKey][date],
        weight: parsedWeight ?? 0,
      }
      return updated
    })
  
    setModifiedCells(prev => {
      const filtered = prev.filter(c => !(c.rowKey === rowKey && c.date === date))
      return [
        ...filtered,
        {
          rowKey,
          date,
          weight: parsedWeight ?? 0,
          id: logMap[rowKey]?.[date]?.id,
        },
      ]
    })
  }  

  const saveAllChanges = async () => {
    const inserts: InsertLog[] = []
    const updates: UpdateLog[] = []
  
    // 1. 기존 수정된 셀
    for (const entry of modifiedCells) {
      const [target, workout] = entry.rowKey.split('||')
      if (entry.id) {
        updates.push({
          id: entry.id,
          weight: entry.weight,
        })
      } else {
        inserts.push({
          member_id: member.member_id,
          target,
          workout,
          workout_date: entry.date,
          reps: 0,
          weight: entry.weight,
        })
      }
    }
  
    // 2. 신규 날짜 추가된 셀 입력 (addingDate + newLogInputs)
    if (addingDate) {
      for (const key of Object.keys(newLogInputs)) {
        const [target, workout] = key.split('||')
        const weight = Number(newLogInputs[key].weight)
        if (weight > 0) {
          inserts.push({
            member_id: member.member_id,
            target,
            workout,
            workout_date: addingDate,
            reps: 0,
            weight,
          })
        }
      }
    }
  
    // 3. 신규 운동 행 추가된 셀 입력 (newTarget + newWorkoutInputs)
    if (addingRow) {
      for (const date of dates) {
        const weight = Number(newWorkoutInputs[date]?.weight)
        if (weight > 0) {
          inserts.push({
            member_id: member.member_id,
            target: newTarget,
            workout: newWorkout,
            workout_date: date,
            reps: 0,
            weight,
          })
        }
      }
    }
  
    // Supabase 저장 처리
    const updateErrors: string[] = []
  
    for (const u of updates) {
      if (!u.weight || u.weight <= 0) {
        const { error } = await supabase
          .from('workout_logs')
          .delete()
          .eq('workout_id', u.id)
        if (error) updateErrors.push(`삭제 실패: ID ${u.id}`)
      } else {
        const { error } = await supabase
          .from('workout_logs')
          .update({ weight: u.weight })
          .eq('workout_id', u.id)
        if (error) updateErrors.push(`업데이트 실패: ID ${u.id}`)
      }
    }
    
    if (inserts.length > 0) {
      const { error } = await supabase.from('workout_logs').insert(inserts)
      if (error) updateErrors.push('신규 데이터 삽입 오류')
    }
  
    if (updateErrors.length > 0) {
      alert('일부 저장 실패: ' + updateErrors.join(', '))
    } else {
      alert('기록 수정을 완료하였습니다 😊')
      setModifiedCells([])
      setAddingDate(null)
      setAddingRow(false)
      fetchLogs()
    }
  }

  

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div
        className="relative bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] p-6 text-gray-700 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex-shrink-0">
          운동 기록 관리
        </h2>

        {/* overflow-x-auto로 좌우 스크롤 가능하게 래핑 */}
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full border border-gray-300 text-sm table-fixed">
            <thead className="bg-gray-100 text-gray-700 select-none">
              <tr>
                {/* sticky + left 고정, z-index로 겹침 방지, bg-gray-200 적용 */}
                <th
                  className="border border-gray-300 px-3 py-2 text-left font-semibold sticky left-0 bg-gray-200 z-30"
                  style={{ minWidth: '120px', maxWidth: '120px' }}
                >
                  Target
                </th>
                <th
                  className="border border-gray-300 px-3 py-2 text-left font-semibold sticky left-[120px] bg-gray-200 z-20"
                  style={{ minWidth: '140px', maxWidth: '140px' }}
                >
                  Workout
                </th>
                {dates.map(date => {
                  const parts = date.split('-'); // ['2025', '06', '13']
                  const year = parts[0];
                  const monthDay = parts.slice(1).join('-'); // '06-13'
                  return (
                    <th
                      key={date}
                      className="border border-gray-300 px-3 py-2 text-center font-semibold sticky top-0 bg-gray-100 z-10"
                      style={{ minWidth: '90px', maxWidth: '90px' }}
                    >
                      {year}<br />{monthDay}
                    </th>
                  );
                })}
                {addingDate !== null && (
                  <th
                    className="border border-gray-300 px-3 py-2 text-center font-semibold sticky top-0 bg-yellow-50 z-10"
                    style={{ minWidth: '90px', maxWidth: '90px' }}
                  >
                    <input
                      type="date"
                      className="text-xs w-full text-center border border-gray-300 rounded"
                      value={addingDate}
                      onChange={e => setAddingDate(e.target.value)}
                    />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white">
              {rows.map(({ target, workout }) => {
                const rowKey = `${target}||${workout}`
                return (
                  <tr key={rowKey} className="hover:bg-blue-50">
                    <td
                      className="border border-gray-300 px-3 py-1 whitespace-nowrap sticky left-0 bg-gray-100 z-20 font-medium"
                      style={{ minWidth: '120px', maxWidth: '120px' }}
                    >
                      {target}
                    </td>
                    <td
                      className="border border-gray-300 px-3 py-1 whitespace-nowrap sticky left-[120px] bg-gray-100 z-10"
                      style={{ minWidth: '140px', maxWidth: '140px' }}
                    >
                      {workout}
                    </td>
                    {dates.map(date => {
                      // const logEntry = logMap[rowKey]?.[date]
                      return (
                        <td
                          key={date}
                          className="border border-gray-300 px-2 py-1 text-center"
                          style={{ minWidth: '90px', maxWidth: '90px' }}
                        >
                          <input
                            type="number"
                            className="w-full text-center border border-gray-200 rounded"
                            value={logMap[rowKey]?.[date]?.weight || ''}
                            onChange={e =>
                              handleCellChange(rowKey, date, Number(e.target.value))
                            }
                          />
                        </td>
                      )
                    })}
                    {addingDate !== null && (
                      <td
                        className="border border-gray-300 px-2 py-1 text-center bg-yellow-50"
                        style={{ minWidth: '90px', maxWidth: '90px' }}
                      >
                        <input
                          type="number"
                          min={0}
                          value={newLogInputs[rowKey]?.weight || ''}
                          onChange={e =>
                            handleNewLogInputChange(rowKey, e.target.value)
                          }
                          className="w-full text-center rounded border border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                          placeholder="-"
                        />
                      </td>
                    )}
                  </tr>
                )
              })}

              {/* 새 운동 항목 추가 */}
              {addingRow && (
                <tr className="bg-green-50">
                  <td
                    className="border border-gray-300 px-3 py-1 whitespace-nowrap sticky left-0 bg-green-100 z-10"
                    style={{ minWidth: '120px', maxWidth: '120px' }}
                  >
                    <input
                      type="text"
                      placeholder="Target"
                      value={newTarget}
                      onChange={e => setNewTarget(e.target.value)}
                      className="w-full rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-green-400 px-1"
                    />
                  </td>
                  <td
                    className="border border-gray-300 px-3 py-1 whitespace-nowrap sticky left-[120px] bg-green-100 z-10"
                    style={{ minWidth: '140px', maxWidth: '140px' }}
                  >
                    <input
                      type="text"
                      placeholder="Workout"
                      value={newWorkout}
                      onChange={e => setNewWorkout(e.target.value)}
                      className="w-full rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-green-400 px-1"
                    />
                  </td>
                  {dates.map(date => (
                    <td
                      key={date}
                      className="border border-gray-300 px-2 py-1 text-center"
                      style={{ minWidth: '90px', maxWidth: '90px' }}
                    >
                      <input
                        type="number"
                        min={0}
                        placeholder="-"
                        value={newWorkoutInputs[date]?.weight || ''}
                        onChange={e =>
                          handleNewWorkoutInputChange(date, e.target.value)
                        }
                        className="w-full text-center rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-green-400"
                      />
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>



        <div className="mt-6 flex flex-wrap justify-end gap-2 sm:gap-3">
          {/* 날짜 추가 */}
          {addingDate === null && !addingRow && (
            <Button
              variant="outline"
              size="sm"
              onClick={startAddingDate}
              className="h-9 min-w-[100px] px-4 text-sm flex items-center gap-1.5 text-yellow-600 border-yellow-500 hover:bg-yellow-50"
            >
              <Plus size={16} />
              날짜 추가
            </Button>
          )}

          {/* 날짜 추가 취소 */}
          {addingDate !== null && (
            <Button
              variant="outline"
              size="sm"
              onClick={cancelAddingDate}
              className="h-9 min-w-[100px] px-4 text-sm text-gray-600 border-gray-400 hover:bg-gray-50"
            >
              취소
            </Button>
          )}

          {/* 운동 추가 */}
          {addingDate === null && !addingRow && (
            <Button
              variant="outline"
              size="sm"
              onClick={startAddingRow}
              className="h-9 min-w-[100px] px-4 text-sm flex items-center gap-1.5 text-green-600 border-green-500 hover:bg-green-50"
            >
              <Plus size={16} />
              운동 추가
            </Button>
          )}

          {/* 운동 추가 취소 */}
          {addingRow && (
            <Button
              size="sm"
              onClick={cancelAddingRow}
              variant="outline"
              className="h-9 min-w-[100px] px-4 text-sm text-gray-600 border-gray-400 hover:bg-gray-50"
            >
              취소
            </Button>
          )}

          {/* 저장/닫기 버튼 */}
          <Button 
            onClick={saveAllChanges} 
            disabled={!canSave}
            variant="outline"
            className="h-9 min-w-[100px] px-4 text-sm text-blue-600 border-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            저장
          </Button>
          <Button  
            onClick={onClose}
            variant="outline"
            className="h-9 min-w-[100px] px-4 text-sm text-gray-600 border-gray-400 hover:bg-gray-50"
          >
            닫기
          </Button>
        </div>


      </div>
    </div>
  )
}
