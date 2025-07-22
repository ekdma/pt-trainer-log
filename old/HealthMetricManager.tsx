'use client'

import { CalendarPlus} from 'lucide-react'
import React, { useEffect, useState, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Disclosure } from '@headlessui/react'
import { ChevronUpIcon } from '@heroicons/react/20/solid'
import dayjs from 'dayjs';
import { normalizeDateInput, handleKeyNavigation } from '@/utils/inputUtils';
import { useHorizontalDragScroll } from '@/utils/useHorizontalDragScroll';

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
  const [dates, setDates] = useState<string[]>([])
  const [rows, setRows] = useState<{ metric_target: string; metric_type: string }[]>([])
  const [logMap, setLogMap] = useState<Record<string, Record<string, { metric_value: number; id?: number }>>>({})
  const today = new Date().toISOString().split('T')[0];
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [newLogInputs, setNewLogInputs] = useState<Record<string, { metric_value: string }>>({})
  const [addingRow, setAddingRow] = useState(false)
  const [newTarget, setNewTarget] = useState('')
  const [newWorkout, setNewWorkout] = useState('')
  const [modifiedCells, setModifiedCells] = useState<{ rowKey: string; date: string; metric_value: number; id?: number }[]>([])
  const hasModifiedCells = modifiedCells.length > 0
  const hasNewLogInputs = addingDate !== null && Object.values(newLogInputs).some(input => Number(input.metric_value) > 0)
  const canSave = hasModifiedCells || hasNewLogInputs //|| hasNewWorkoutInputs
  const supabase = getSupabaseClient()
  const [isEmptyLog, setIsEmptyLog] = useState(false) // 로그 비었는지 여부
  const [disclosureOpen, setDisclosureOpen] = useState(false)
  const [loadingManage, setLoadingManage] = useState(false)
  const [allTypes, setAllTypes] = useState<
    { health_metric_type_id: number; metric_target: string; metric_type: string; order_target: number; order_type: number }[]
  >([])
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({}); 
  
  const [yy, mm, dd] = today.split('-'); // year = "2025", month = "06", day = "20"

  const [year, setYear] = useState(yy.slice(2)); // "25"
  const [month, setMonth] = useState(mm);        // "06"
  const [day, setDay] = useState(dd);            // "20"
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

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
  
    const newLogMap: typeof logMap = {}
    for (const l of logs ?? []) {
      const rowKey = `${l.metric_target}||${l.metric_type}`
      if (!newLogMap[rowKey]) newLogMap[rowKey] = {}
      newLogMap[rowKey][l.measure_date] = {
        metric_value: l.metric_value,
        id: l.health_id,
      }
    }
  
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

    setTimeout(() => {
      dateInputRef.current?.focus();
    }, 0);
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
      
    // ✅ 날짜 중복 검사
    if (addingDate && dates.includes(addingDate)) {
      alert(`이미 존재하는 날짜입니다: ${dayjs(addingDate).format('YYYY-MM-DD')} ☹`)
      return
    }
  
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
      alert('모든 필드를 입력해주세요 😎')
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
      alert('건강지표 추가를 완료하였습니다 😊')
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
    else {
      alert('건강지표 삭제를 완료하였습니다 😊')
      fetchLogs()
    }
  }
    
  const scrollRef = useRef<HTMLDivElement>(null);
  useHorizontalDragScroll(scrollRef);

  // 열 추가시 오른쪽 끝으로 자동 스크롤
  useEffect(() => {
    if (addingDate && scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, [addingDate]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 저장: Ctrl + S
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault(); // 브라우저 기본 저장 방지
        if (canSave) {
          saveAllChanges();
        }
      }
      // 날짜 추가: Ctrl + A
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (addingDate === null && !addingRow) {
          startAddingDate();
        }
      }
    // 날짜 추가 취소: ESC
      if (e.key === 'Escape') {
        if (addingDate) {
          cancelAddingDate(); // 날짜 추가 중이면 취소
        }
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canSave, addingDate, addingRow, saveAllChanges, startAddingDate, cancelAddingDate]);
  
  useEffect(() => {
    if (addingDate !== null && yearRef.current) {
      // 날짜 추가되면 '년도'에 자동 포커스 및 전체 선택
      yearRef.current.focus();
      yearRef.current.select();
    }
  }, [addingDate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div
        className="relative bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] p-6 text-gray-700 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-semibold text-gray-800">건강지표 관리</h2>
          </div>
        </div>


        {/* overflow-x-auto로 좌우 스크롤 가능하게 래핑 */}
        <div ref = {scrollRef} className="overflow-auto bg-white border border-white">
          <table className="table-fixed min-w-max text-sm border-collapse border border-gray-300 bg-white">
            <thead className="bg-gray-100 text-gray-700 select-none">
              <tr>
                <th className="border px-2 py-2 text-center font-semibold w-[120px] md:sticky top-0 md:left-0 bg-gray-200 md:z-40">
                  TARGET
                </th>
                <th className="border px-2 py-2 text-center text-sm font-semibold w-[150px] md:sticky top-0 md:left-[120px] bg-gray-200 md:z-30">
                  HEALTH METRIC
                </th>

                {/* 날짜 열 */}
                {dates.map((date) => (
                  <th
                    key={date}
                    className="border px-1 py-1 text-center text-xs font-semibold md:sticky top-0 bg-gray-100 z-10 w-[80px] whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    {dayjs(date).format('YY.MM.DD')}
                  </th>
                ))}

                {/* 추가 날짜 입력 열 */}
                {addingDate !== null && (
                  <th className="border px-1 py-1 text-center text-xs font-semibold md:sticky top-0 bg-yellow-50 z-10 w-[100px]">
                    <div className="flex gap-[2px]">
                      <input
                        ref={yearRef}
                        type="text"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab' && !e.shiftKey) {
                            e.preventDefault();
                            monthRef.current?.focus();
                            monthRef.current?.select();
                          }
                        }}
                        className="w-[20px] text-center border rounded text-[12px]"
                        placeholder="yy"
                        maxLength={2}
                      />
                      .
                      <input
                        ref={monthRef}
                        type="text"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab' && !e.shiftKey) {
                            e.preventDefault();
                            dayRef.current?.focus();
                            dayRef.current?.select();
                          }
                        }}
                        className="w-[20px] text-center border rounded text-[12px]"
                        placeholder="mm"
                        maxLength={2}
                      />
                      .
                      <input
                        ref={dayRef}
                        type="text"
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            e.preventDefault();
                            const fullDate = `${year}.${month}.${day}`;
                            const normalized = normalizeDateInput(fullDate);
                            if (normalized) {
                              setAddingDate(normalized);
                        
                              // focus 다음 weight 입력칸으로 이동
                              setTimeout(() => {
                                const colIndex = dates.length; // 신규 열은 마지막 index
                                let targetRow = 0;
                        
                                while (
                                  targetRow < rows.length &&
                                  inputRefs.current[`${targetRow}-${colIndex}`]?.disabled
                                ) {
                                  targetRow += 1;
                                }
                        
                                const nextInput = inputRefs.current[`${targetRow}-${colIndex}`];
                                if (nextInput && !nextInput.disabled) {
                                  nextInput.focus();
                                  nextInput.select?.();
                                }
                              }, 50);
                            }
                          }
                        }}
                        
                        className="w-[20px] text-center border rounded text-[12px]"
                        placeholder="dd"
                        maxLength={2}
                      />
                    </div>
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="bg-white">
              {rows.map(({ metric_target, metric_type }, rowIndex) => {
                const rowKey = `${metric_target}||${metric_type}`;

                return (
                  <tr key={rowKey} className="hover:bg-blue-50 text-sm">
                    {/* TARGET */}
                    <td className="border px-2 py-1 md:sticky left-0 z-30 font-semibold relative whitespace-normal bg-gray-50">
                      {metric_target}
                    </td>

                    {/* TYPE */}
                    <td className="border px-2 py-1 md:sticky left-[120px] bg-gray-50 z-20 font-semibold whitespace-normal">
                      {metric_type}
                    </td>

                    {/* 날짜별 셀 */}
                    {dates.map((date, colIndex) => {
                      const totalRows = rows.length;
                      const totalCols = dates.length + (addingDate ? 1 : 0);
                      return (
                        <td key={date} className="border px-1 py-1 text-center w-[80px]">
                          <input
                            type="number"
                            className={`
                              w-full text-center border rounded text-sm
                              ${logMap[rowKey]?.[date]?.metric_value == null
                                ? 'bg-sky-50 border-sky-100'
                                : 'border-gray-200'
                              }
                            `}
                            value={
                              logMap[rowKey]?.[date]?.metric_value != null
                                ? logMap[rowKey][date].metric_value
                                : ''
                            }
                            onChange={(e) =>
                              handleCellChange(rowKey, date, Number(e.target.value))
                            }
                            onKeyDown={(e) => handleKeyNavigation(e, rowIndex, colIndex, totalRows, totalCols, inputRefs)}
                            ref={(el) => {
                              inputRefs.current[`${rowIndex}-${colIndex}`] = el;
                            }}
                          />
                        </td>
                      );
                    })}

                    {/* 추가 날짜 셀 */}
                    {addingDate && (() => {
                      const totalRows = rows.length;
                      const totalCols = dates.length + (addingDate ? 1 : 0);
                      const colIndex = dates.length; // 기존 날짜 열 개수 = 이게 새로운 열의 index
                      return (
                        <td className="border px-1 py-1 text-center bg-yellow-50 w-[80px]">
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
                            onKeyDown={(e) => handleKeyNavigation(e, rowIndex, colIndex, totalRows, totalCols, inputRefs)}
                            ref={(el) => {
                              inputRefs.current[`${rowIndex}-${colIndex}`] = el;
                            }}
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
              className="h-9 px-4 text-sm flex items-center gap-1.5 text-yellow-600 border-yellow-500 hover:bg-yellow-50"
            >
              <CalendarPlus size={16} />
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
                    placeholder="예: Body Composition"
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
                    placeholder="예: Weight"
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