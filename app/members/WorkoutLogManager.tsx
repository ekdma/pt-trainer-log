'use client'

import { Plus} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Disclosure } from '@headlessui/react'
import { ChevronUpIcon } from '@heroicons/react/20/solid'

type Member = {
  member_id: number
  name: string
  level: string
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
  const [rows, setRows] = useState<{ target: string; workout: string; level: string }[]>([])
  const [logMap, setLogMap] = useState<Record<string, Record<string, { weight: number; id?: number }>>>({})
  const today = new Date().toISOString().split('T')[0];
  const [addingDate, setAddingDate] = useState<string | null>(null);
  // const [addingDate, setAddingDate] = useState<string | null>(null)
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
  const [isEmptyLog, setIsEmptyLog] = useState(false) // 로그 비었는지 여부
  const [disclosureOpen, setDisclosureOpen] = useState(false)
  const [newLevel, setNewLevel] = useState('')
  const [loadingManage, setLoadingManage] = useState(false)
  const [allTypes, setAllTypes] = useState<
    { workout_type_id: number; target: string; workout: string; level: string; order_target: number; order_workout: number }[]
  >([])

  useEffect(() => {
    fetchLogs()
  }, [member.member_id])

  useEffect(() => {
    if (disclosureOpen) {
      fetchLogs()
    }
  }, [disclosureOpen])

  const fetchLogs = async () => {
    const { data: logs, error: logError } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('member_id', member.member_id)
  
    if (logError) {
      alert('불러오기 오류: ' + logError.message)
      return
    }
  
    const { data: memberInfo, error: memberError } = await supabase
      .from('members')
      .select('level')
      .eq('member_id', member.member_id)
      .single()
  
    if (memberError || !memberInfo) {
      alert('멤버 정보 불러오기 오류: ' + (memberError?.message ?? '데이터 없음'))
      return
    }
  
    const memberLevel = memberInfo.level // ex. "Level 2"
    const levelNumber = parseInt(memberLevel.replace(/\D/g, '')) // 숫자만 추출: 2
  
    const { data: workoutTypes, error: typeError } = await supabase
      .from('workout_types')
      .select('workout_type_id, target, workout, order_target, order_workout, level')
  
    if (typeError) {
      alert('운동 타입 불러오기 오류: ' + typeError.message)
      return
    }
  
    // member level 이하만 필터링 (ex. Level 1, Level 2)
    const allowedTypes = (workoutTypes ?? []).filter(t => {
      const typeLevel = parseInt(t.level.replace(/\D/g, ''))
      return typeLevel <= levelNumber
    })
  
    // target + workout 기준으로 중복 제거 (level 높은 것이 우선)
    const typeMap = new Map<string, typeof allowedTypes[number]>()
    for (const type of allowedTypes) {
      const key = `${type.target}||${type.workout}`
      const existing = typeMap.get(key)
      if (!existing || parseInt(type.level.replace(/\D/g, '')) > parseInt(existing.level.replace(/\D/g, ''))) {
        typeMap.set(key, type)
      }
    }
  
    const filteredTypes = Array.from(typeMap.values())
  
    if (onUpdateLogs) onUpdateLogs(logs ?? [])
  
    const uniqueDates = Array.from(new Set((logs ?? []).map(l => l.workout_date))).sort()
  
    const orderMap = new Map<string, { order_target: number; order_workout: number }>()
    for (const type of filteredTypes) {
      orderMap.set(`${type.target}||${type.workout}`, {
        order_target: type.order_target,
        order_workout: type.order_workout
      })
    }
  
    const rows = filteredTypes.sort((a, b) => {
      const levelA = parseInt(a.level.replace(/\D/g, '')) || 999
      const levelB = parseInt(b.level.replace(/\D/g, '')) || 999
    
      if (levelA !== levelB) return levelA - levelB
    
      const orderA = orderMap.get(`${a.target}||${a.workout}`) || { order_target: 999, order_workout: 999 }
      const orderB = orderMap.get(`${b.target}||${b.workout}`) || { order_target: 999, order_workout: 999 }
    
      if (orderA.order_target !== orderB.order_target) {
        return orderA.order_target - orderB.order_target
      }
      return orderA.order_workout - orderB.order_workout
    })
  
    const newLogMap: typeof logMap = {}
    for (const l of logs ?? []) {
      const rowKey = `${l.target}||${l.workout}`
      if (!newLogMap[rowKey]) newLogMap[rowKey] = {}
      newLogMap[rowKey][l.workout_date] = {
        weight: l.weight,
        id: l.workout_id,
      }
    }
  
    setDates(uniqueDates)
    setRows(rows.map(r => ({ target: r.target, workout: r.workout, level: r.level })))
    setAllTypes(workoutTypes ?? [])
    setLogMap(newLogMap)
    setIsEmptyLog((logs ?? []).length === 0)
  }
  
  

  const startAddingDate = () => {
    if (addingDate !== null) return;
    setAddingDate(today); // 또는 null로 설정
    setNewLogInputs({});
  };

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
  
    // 오늘 날짜를 dates에 추가 (중복 방지)
    if (dates.length === 0 && !dates.includes(today)) {
      setDates(prev => [...prev, today])
    }
  }

  const handleNewWorkoutInputChange = (date: string, value: string) => {
    setNewWorkoutInputs(prev => ({
      ...prev,
      [date]: { weight: value },
    }))
  }

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

  const handleAddType = async () => {
    if (!newTarget || !newWorkout || !newLevel) {
      alert('모든 필드를 입력해주세요.')
      return
    }
  
    setLoadingManage(true)
  
    // 1. 같은 target이 있는지 찾기
    const existingTarget = allTypes.find(t => t.target === newTarget)
  
    let order_target: number
  
    if (existingTarget) {
      order_target = existingTarget.order_target // 기존 값 재사용
    } else {
      // 2. 없다면 최대값 + 1로 새로 부여
      const maxOrder = allTypes.reduce((max, t) => Math.max(max, t.order_target ?? 0), 0)
      order_target = maxOrder + 1
    }
  
    // 3. order_workout은 해당 target 내에서 가장 큰 값 + 1
    const sameTargetWorkouts = allTypes.filter(t => t.target === newTarget)
    const maxOrderWorkout = sameTargetWorkouts.reduce((max, t) => Math.max(max, t.order_workout ?? 0), 0)
    const order_workout = maxOrderWorkout + 1
  
    const { error } = await supabase.from('workout_types').insert([
      {
        target: newTarget,
        workout: newWorkout,
        level: newLevel,
        order_target,
        order_workout,
      }
    ])
  
    if (error) {
      alert('추가 중 오류 발생: ' + error.message)
    } else {
      setNewTarget('')
      setNewWorkout('')
      setNewLevel('')
      // 다시 불러오기
      fetchLogs()
    }
  
    setLoadingManage(false)
  }
  

  const handleDeleteType = async (id?: number) => {
    if (!id) return
    if (!confirm('정말 삭제하시겠습니까?')) return

    const { error } = await supabase
      .from('workout_types')
      .delete()
      .eq('workout_type_id', id)

    if (error) alert('삭제 실패: ' + error.message)
    else fetchLogs()
  }
  

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div
        className="relative bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] p-6 text-gray-700 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-6 bg-blue-500 rounded" />
            <h2 className="text-2xl font-bold text-gray-800">운동 기록 관리</h2>
            <div
              className={`ml-2 px-3 py-1 rounded-md text-white font-semibold shadow-sm text-xs ${
                member.level === 'Level 1' ? 'bg-yellow-500' :
                member.level === 'Level 2' ? 'bg-green-500' :
                member.level === 'Level 3' ? 'bg-blue-500' :
                member.level === 'Level 4' ? 'bg-red-500' :
                member.level === 'Level 5' ? 'bg-black' :
                'bg-gray-400'
              }`}
            >
              {member.level}
            </div>
          </div>
        </div>


        {/* overflow-x-auto로 좌우 스크롤 가능하게 래핑 */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-300 table-auto">
            <thead className="bg-gray-100 text-gray-700 select-none">
              <tr>
                <th className="border border-gray-300 px-2 py-2 text-left font-bold min-w-[70px] sticky left-0 bg-gray-200 z-40 whitespace-normal">
                  Level
                </th>
                <th className="border border-gray-300 px-2 py-2 text-left font-bold min-w-[100px] sticky left-[80px] bg-gray-200 z-30 whitespace-normal">
                  Target
                </th>
                <th className="border border-gray-300 px-2 py-2 text-left font-bold min-w-[120px] sticky left-[200px] bg-gray-200 z-20 whitespace-normal">
                  Workout
                </th>
                {dates.map((date) => {
                  const [year, ...rest] = date.split('-');
                  return (
                    <th
                      key={date}
                      className="border px-2 py-1 text-center font-semibold bg-gray-100 z-10 min-w-[80px] whitespace-normal"
                    >
                      {year}
                      <br />
                      {rest.join('-')}
                    </th>
                  );
                })}
                {addingDate && (
                  <th className="border px-2 py-1 text-center font-semibold bg-yellow-50 z-10 min-w-[90px]">
                    <input
                      type="date"
                      className="text-xs w-full text-center border border-gray-300 rounded"
                      value={addingDate}
                      onChange={(e) => setAddingDate(e.target.value)}
                    />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white">
              {rows.map(({ target, workout, level }) => {
                const rowKey = `${target}||${workout}`;

                const levelColor = {
                  'Level 1': 'bg-yellow-400',
                  'Level 2': 'bg-green-400',
                  'Level 3': 'bg-blue-400',
                  'Level 4': 'bg-red-400',
                  'Level 5': 'bg-gray-800',
                }[level] || 'bg-gray-400';

                return (
                  <tr key={rowKey} className="hover:bg-blue-50 text-sm">
                    <td
                      className="border px-2 py-1 sticky left-0 z-30 font-semibold relative pl-6 whitespace-normal bg-gray-50"
                    >
                      <span className={`absolute left-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${levelColor}`} />
                      {level}
                    </td>
                    <td
                      className="border px-2 py-1 sticky left-[80px] bg-gray-50 z-20 font-semibold whitespace-normal"
                    >
                      {target}
                    </td>
                    <td
                      className="border px-2 py-1 sticky left-[200px] bg-gray-50 z-10 font-semibold whitespace-normal"
                    >
                      {workout}
                    </td>
                    {dates.map((date) => (
                      <td
                        key={date}
                        className="border px-2 py-1 text-center min-w-[80px]"
                      >
                        <input
                          type="number"
                          className="w-full text-center border border-gray-200 rounded text-sm"
                          value={logMap[rowKey]?.[date]?.weight || ''}
                          onChange={(e) =>
                            handleCellChange(rowKey, date, Number(e.target.value))
                          }
                        />
                      </td>
                    ))}
                    {addingDate && (
                      <td className="border px-2 py-1 text-center bg-yellow-50 min-w-[90px]">
                        <input
                          type="number"
                          min={0}
                          value={newLogInputs[rowKey]?.weight || ''}
                          onChange={(e) =>
                            handleNewLogInputChange(rowKey, e.target.value)
                          }
                          className="w-full text-center rounded border border-yellow-400 focus:ring-1 focus:ring-yellow-500 text-sm"
                          placeholder="-"
                        />
                      </td>
                    )}
                  </tr>
                )
              })}

              {/* 새 운동 항목 추가 */}
              {/* {addingRow && (
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
              )} */}
            </tbody>
          </table>
        </div>


        {isEmptyLog && (
          <div className="mt-4 text-center text-sm text-gray-500">
            등록된 운동 로그가 없습니다. 기록을 추가해주세요 😎
          </div>
        )}          

        <div className="mt-6 flex flex-wrap justify-end gap-2 sm:gap-3">
          {/* 날짜 추가 */}
          {addingDate === null && !addingRow && (
            <Button
              variant="outline"
              // size="sm"
              onClick={startAddingDate}
              className="h-9 min-w-[100px] px-4 text-sm flex items-center gap-1.5 text-yellow-600 border-yellow-500 hover:bg-yellow-50"
            >
              <Plus size={16} />
              날짜 추가
            </Button>
          )}

          {/* 날짜 추가 취소 */}
          {addingDate && (
            <Button
              variant="outline"
              // size="sm"
              onClick={cancelAddingDate}
              type="button"
              className="h-9 text-sm"
            >
              취소
            </Button>
          )}

          {/* 운동 추가 */}
          {/* {addingDate === null && !addingRow && !isEmptyLog && (
            <Button
              variant="outline"
              // size="sm"
              onClick={startAddingRow}
              className="h-9 min-w-[100px] px-4 text-sm flex items-center gap-1.5 text-green-600 border-green-500 hover:bg-green-50"
            >
              <Plus size={16} />
              운동 추가
            </Button>
          )} */}

          {/* 운동 추가 취소 */}
          {/* {addingRow && (
            <Button
              // size="sm"
              onClick={cancelAddingRow}
              variant="outline"
              type="button"
              className="h-9 text-sm"
            >
              취소
            </Button>
          )} */}

          {/* 저장/닫기 버튼 */}
          <Button 
            onClick={saveAllChanges} 
            disabled={!canSave}
            variant="outline"
            className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            
          >
            저장
          </Button>
          <Button  
            onClick={onClose}
            variant="outline"
            type="button"
            className="h-9 text-sm"
          >
            닫기
          </Button>
        </div>

        <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button
                className="flex w-full justify-between items-center mt-6 text-sm font-medium text-indigo-600 hover:underline"
                onClick={() => setDisclosureOpen(!open)}
              >
                <span>측정 항목 추가/삭제</span>
                <ChevronUpIcon
                  className={`h-5 w-5 transform transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </Disclosure.Button>

              <Disclosure.Panel className="mt-2 bg-white border rounded-xl shadow-md p-6 text-sm space-y-4 text-gray-800">
                <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1.5fr_1fr_auto] gap-4 items-end">
                  {/* Target Input */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">분류 (Target)</label>
                    <input
                      type="text"
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                      placeholder="예: Leg"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>

                  {/* Workout Input */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">항목 (Workout)</label>
                    <input
                      type="text"
                      value={newWorkout}
                      onChange={(e) => setNewWorkout(e.target.value)}
                      placeholder="예: Squat"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>

                  {/* Level Select */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">난이도 (Level)</label>
                    <select
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      <option value="">선택</option>
                      <option value="Level 1">Level 1</option>
                      <option value="Level 2">Level 2</option>
                      <option value="Level 3">Level 3</option>
                      <option value="Level 4">Level 4</option>
                      <option value="Level 5">Level 5</option>
                    </select>
                  </div>

                  {/* Add Button */}
                  <div>
                    <button
                      type="button"
                      onClick={handleAddType}
                      disabled={loadingManage}
                      className="w-fit bg-indigo-600 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      추가
                    </button>
                  </div>
                </div>

                <ul className="max-h-40 overflow-y-auto border-t pt-3 space-y-1 text-sm text-gray-700">
                {[...allTypes]
                  .sort((a, b) => {
                    // level은 문자열, order_target / order_workout은 숫자
                    if (a.level !== b.level) return a.level.localeCompare(b.level)
                    if (a.order_target !== b.order_target) return a.order_target - b.order_target
                    return a.order_workout - b.order_workout
                  })
                  .map((m) => (
                    <li
                      key={m.workout_type_id}
                      className="flex justify-between items-center border-b py-1 px-1"
                    >
                      <span>{m.target} / {m.workout} / {m.level}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteType(m.workout_type_id)}
                        className="text-red-500 hover:underline text-xs"
                      >
                        삭제
                      </button>
                    </li>
                ))}

                </ul>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>



      </div>
    </div>
  )
}
