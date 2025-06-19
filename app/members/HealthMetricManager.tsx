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
}

type HealthMetric = {
  health_id: number
  member_id: number
  measure_date: string
  metric_target: string
  metric_type: string
  metric_value: number
}

interface HealthMetricManagerProps {
  member: Member
  logs: HealthMetric[]
  onClose?: () => void
  onUpdateLogs?: (updatedLogs: HealthMetric[]) => void
}

type InsertLog = {
  member_id: string | number;
  metric_target: string;
  metric_type: string;
  measure_date: string;
  metric_value: number;
}

type UpdateLog = {
  id: string | number;
  metric_value: number;
}

export default function HealthMetricManager({
  member,
  onClose,
  onUpdateLogs,
}: HealthMetricManagerProps) {
  // const [workoutLogs, setWorkoutLogs] = useState<WorkoutRecord[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [rows, setRows] = useState<{ metric_target: string; metric_type: string }[]>([])
  const [logMap, setLogMap] = useState<Record<string, Record<string, { metric_value: number; id?: number }>>>({})
  const today = new Date().toISOString().split('T')[0];
  const [addingDate, setAddingDate] = useState<string | null>(null);
  // const [addingDate, setAddingDate] = useState<string | null>(null)
  const [newLogInputs, setNewLogInputs] = useState<Record<string, { metric_value: string }>>({})
  const [addingRow, setAddingRow] = useState(false)
  const [newTarget, setNewTarget] = useState('')
  const [newWorkout, setNewWorkout] = useState('')
  // const [newWorkoutInputs, setNewWorkoutInputs] = useState<Record<string, { weight: string }>>({})
  const [modifiedCells, setModifiedCells] = useState<{ rowKey: string; date: string; metric_value: number; id?: number }[]>([])
  const hasModifiedCells = modifiedCells.length > 0
  const hasNewLogInputs = addingDate !== null && Object.values(newLogInputs).some(input => Number(input.metric_value) > 0)
  // const hasNewWorkoutInputs = addingRow && Object.values(newWorkoutInputs).some(input => Number(input.weight) > 0)
  const canSave = hasModifiedCells || hasNewLogInputs //|| hasNewWorkoutInputs
  const supabase = getSupabaseClient()
  const [isEmptyLog, setIsEmptyLog] = useState(false) // 로그 비었는지 여부
  const [disclosureOpen, setDisclosureOpen] = useState(false)
  // const [newLevel, setNewLevel] = useState('')
  const [loadingManage, setLoadingManage] = useState(false)
  const [allTypes, setAllTypes] = useState<
    { health_metric_type_id: number; metric_target: string; metric_type: string; order_target: number; order_type: number }[]
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
      .from('health_metrics')
      .select('*')
      .eq('member_id', member.member_id)
  
    if (logError) {
      alert('불러오기 오류: ' + logError.message)
      return
    }
  
    const { data: healthmetricTypes, error: typeError } = await supabase
      .from('health_metric_types')
      .select('health_metric_type_id, metric_target, metric_type, order_target, order_type')
  
    if (typeError) {
      alert('건강지표 타입 불러오기 오류: ' + typeError.message)
      return
    }
  
    // Map: 'target||workout' → type
    const typeMap = new Map<string, typeof healthmetricTypes[number]>()
    for (const type of healthmetricTypes) {
      const key = `${type.metric_target}||${type.metric_type}`
      typeMap.set(key, type)
    }
  
    const filteredTypes = Array.from(typeMap.values())
  
    if (onUpdateLogs) onUpdateLogs(logs ?? [])
  
    const uniqueDates = Array.from(new Set((logs ?? []).map(l => l.measure_date))).sort()
  
    // Map for ordering
    const orderMap = new Map<string, { order_target: number; order_type: number }>()
    for (const type of filteredTypes) {
      orderMap.set(`${type.metric_target}||${type.metric_type}`, {
        order_target: type.order_target,
        order_type: type.order_type
      })
    }
  
    // Sort rows by order_target > order_type
    const sortedRows = filteredTypes.sort((a, b) => {
      const orderA = orderMap.get(`${a.metric_target}||${a.metric_type}`) || { order_target: 999, order_type: 999 }
      const orderB = orderMap.get(`${b.metric_target}||${b.metric_type}`) || { order_target: 999, order_type: 999 }
  
      if (orderA.order_target !== orderB.order_target) {
        return orderA.order_target - orderB.order_target
      }
      return orderA.order_type - orderB.order_type
    })
  
    // Create logMap
    const newLogMap: typeof logMap = {}
    for (const l of logs ?? []) {
      const rowKey = `${l.metric_target}||${l.metric_type}`
      if (!newLogMap[rowKey]) newLogMap[rowKey] = {}
      newLogMap[rowKey][l.measure_date] = {
        metric_value: l.metric_value,
        id: l.health_id,
      }
    }
  
    // ✅ 최종 상태 업데이트
    setDates(uniqueDates)
    setRows(sortedRows.map(r => ({
      metric_target: r.metric_target,
      metric_type: r.metric_type
    })))
    setAllTypes(healthmetricTypes ?? [])
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
      [rowKey]: { metric_value: value },
    }))
  }

  const handleCellChange = (rowKey: string, date: string, value: number | string) => {
    const metric_value = Number(value)
    const parsedValue = isNaN(metric_value) ? null : metric_value
  
    setLogMap(prev => {
      const updated = { ...prev }
      if (!updated[rowKey]) updated[rowKey] = {}
      updated[rowKey][date] = {
        ...updated[rowKey][date],
        metric_value: parsedValue ?? 0,
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
          metric_value: parsedValue ?? 0,
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
      const [metric_target, metric_type] = entry.rowKey.split('||')
      if (entry.id) {
        updates.push({
          id: entry.id,
          metric_value: entry.metric_value,
        })
      } else {
        inserts.push({
          member_id: member.member_id,
          metric_target,
          metric_type,
          measure_date: entry.date,
          metric_value: entry.metric_value,
        })
      }
    }
  
    // 2. 신규 날짜 추가된 셀 입력 (addingDate + newLogInputs)
    if (addingDate) {
      for (const key of Object.keys(newLogInputs)) {
        const [metric_target, metric_type] = key.split('||')
        const metric_value = Number(newLogInputs[key].metric_value)
        if (metric_value > 0) {
          inserts.push({
            member_id: member.member_id,
            metric_target,
            metric_type,
            measure_date: addingDate,
            metric_value,
          })
        }
      }
    }
  
    // Supabase 저장 처리
    const updateErrors: string[] = []
  
    for (const u of updates) {
      if (!u.metric_value || u.metric_value <= 0) {
        const { error } = await supabase
          .from('health_metrics')
          .delete()
          .eq('health_id', u.id)
        if (error) updateErrors.push(`삭제 실패: ID ${u.id}`)
      } else {
        const { error } = await supabase
          .from('health_metrics')
          .update({ metric_value: u.metric_value })
          .eq('health_id', u.id)
        if (error) updateErrors.push(`업데이트 실패: ID ${u.id}`)
      }
    }
    
    if (inserts.length > 0) {
      const { error } = await supabase.from('health_metrics').insert(inserts)
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
    if (!newTarget || !newWorkout) {
      alert('모든 필드를 입력해주세요.')
      return
    }
  
    setLoadingManage(true)
  
    // === Step 1: target 처리 ===
    const existingTarget = allTypes.find(t => t.metric_target === newTarget)
    let order_target: number
  
    if (existingTarget) {
      order_target = existingTarget.order_target
    } else {
      const maxOrder = allTypes.reduce((max, t) => Math.max(max, t.order_target ?? 0), 0)
      order_target = maxOrder + 1
    }
  
    // === Step 2: order_workout 처리 ===
    const sameTargetWorkouts = allTypes.filter(t => t.metric_target === newTarget)
  
    // 동일한 target + workout 조합이 이미 존재하는가?
    const existingWorkout = sameTargetWorkouts.find(t => t.metric_type === newWorkout)
  
    let order_type: number
  
    if (existingWorkout) {
      // 기존 workout이면 기존 order_workout 재사용
      order_type = existingWorkout.order_type
    } else {
      // 새로운 workout이면 해당 target 내 최대 order_workout + 1
      const maxOrderWorkout = sameTargetWorkouts.reduce((max, t) => Math.max(max, t.order_type ?? 0), 0)
      order_type = maxOrderWorkout + 1
    }
  
    const { error } = await supabase.from('health_metric_types').insert([
      {
        metric_target: newTarget,
        metric_type: newWorkout,
        order_target,
        order_type,
      }
    ])
  
    if (error) {
      alert('추가 중 오류 발생: ' + error.message)
    } else {
      setNewTarget('')
      setNewWorkout('')
      // setNewLevel('')
      fetchLogs()
    }
  
    setLoadingManage(false)
  }
  
  const handleDeleteType = async (id?: number) => {
    if (!id) return
    if (!confirm('정말 삭제하시겠습니까?')) return

    const { error } = await supabase
      .from('health_metric_types')
      .delete()
      .eq('health_metric_type_id', id)

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
            <h2 className="text-2xl font-bold text-gray-800">건강 지표 관리</h2>
          </div>
        </div>


        {/* overflow-x-auto로 좌우 스크롤 가능하게 래핑 */}
        <div className="overflow-x-auto">
          <div className="overflow-x-auto w-full touch-pan-x scrollbar-thin">
            <table className="min-w-max text-sm border border-gray-300 table-auto">
              <thead className="bg-gray-100 text-gray-700 select-none">
                <tr>
                  {/* TARGET */}
                  <th className="border px-2 py-2 text-left font-bold min-w-[80px] sticky left-0 bg-gray-200 z-40 whitespace-normal">
                    TARGET
                  </th>

                  {/* HEALTH METRIC */}
                  <th className="border px-2 py-2 text-left font-bold min-w-[120px] sticky left-[130px] bg-gray-200 z-30 whitespace-normal">
                    HEALTH METRIC
                  </th>

                  {/* 날짜 열 */}
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

                  {/* 추가 날짜 입력 열 */}
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
                {rows.map(({ metric_target, metric_type }) => {
                  const rowKey = `${metric_target}||${metric_type}`;

                  return (
                    <tr key={rowKey} className="hover:bg-blue-50 text-sm">
                      {/* TARGET */}
                      <td className="border px-2 py-1 sticky left-0 z-30 font-semibold whitespace-normal bg-gray-50">
                        {metric_target}
                      </td>

                      {/* TYPE */}
                      <td className="border px-2 py-1 sticky left-[130px] bg-gray-50 z-20 font-semibold whitespace-normal">
                        {metric_type}
                      </td>

                      {/* 날짜별 셀 */}
                      {dates.map((date) => {
                        return (
                          <td key={date} className="border px-2 py-1 text-center min-w-[80px]">
                            <input
                              type="number"
                              className={`
                                w-full text-center border rounded text-sm border-gray-200
                              `}
                              value={logMap[rowKey]?.[date]?.metric_value || ''}
                              onChange={(e) =>
                                handleCellChange(rowKey, date, Number(e.target.value))
                              }
                            />
                          </td>
                        );
                      })}

                      {/* 추가 날짜 셀 */}
                      {addingDate && (() => {
                        return (
                          <td className="border px-2 py-1 text-center bg-yellow-50 min-w-[90px]">
                            <input
                              type="number"
                              min={0}
                              value={newLogInputs[rowKey]?.metric_value || ''}
                              onChange={(e) =>
                                handleNewLogInputChange(rowKey, e.target.value)
                              }
                              className={`
                                w-full text-center rounded border text-sm bg-white border-yellow-400 focus:ring-1 focus:ring-yellow-500
                              `}
                              placeholder="-"
                            />
                          </td>
                        );
                      })()}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>


        {isEmptyLog && (
          <div className="mt-4 text-center text-sm text-gray-500">
            등록된 건강지표 로그가 없습니다. 기록을 추가해주세요 😎
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
                  <label className="block text-xs font-semibold text-gray-500 mb-1">항목 (Type)</label>
                  <input
                    type="text"
                    value={newWorkout}
                    onChange={(e) => setNewWorkout(e.target.value)}
                    placeholder="예: Squat"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                {/* Add Button */}
                <div className="self-stretch flex items-end">
                  <button
                    type="button"
                    onClick={handleAddType}
                    disabled={loadingManage}
                    className="w-full bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    추가
                  </button>
                </div>
              </div>


                <ul className="max-h-40 overflow-y-auto border-t pt-3 space-y-1 text-sm text-gray-700">
                {[...allTypes]
                  .sort((a, b) => {
                    // level은 문자열, order_target / order_workout은 숫자
                    if (a.order_target !== b.order_target) return a.order_target - b.order_target
                    return a.order_type - b.order_type
                  })
                  .map((m) => (
                    <li
                      key={m.health_metric_type_id}
                      className="flex justify-between items-center border-b py-1 px-1"
                    >
                      <span>{m.metric_target} / {m.metric_type}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteType(m.health_metric_type_id)}
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
