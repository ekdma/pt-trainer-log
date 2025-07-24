'use client'

import { CalendarPlus} from 'lucide-react'
import React, { useEffect, useState, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import dayjs from 'dayjs';
import { normalizeDateInput, handleKeyNavigation } from '@/utils/inputUtils';
import { useHorizontalDragScroll } from '@/utils/useHorizontalDragScroll';
import AddHealthMetric from '@/components/health-metric/AddHealthMetric'
import { Button } from '@/components/ui/button'
import type { Member, HealthMetric, HealthMetricType } from '@/components/members/types'

interface HealthMetricManagerProps {
  member: Member
  logs: HealthMetric[]
  allTypes: HealthMetricType[]
  onClose?: () => void
  onUpdateLogs?: (updatedLogs: HealthMetric[]) => void
  onRefreshAllTypes?: () => void
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
  allTypes, 
  onUpdateLogs,
  onRefreshAllTypes,
}: HealthMetricManagerProps) {
  const [isTrainer, setIsTrainer] = useState(false)

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
  const [loadingManage, setLoadingManage] = useState(false)
  // const [allTypes, setAllTypes] = useState<
  //   { health_metric_type_id: number; metric_target: string; metric_type: string; order_target: number; order_type: number }[]
  // >([])
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({}); 
  const [localAllTypes, setLocalAllTypes] = useState<HealthMetricType[]>(allTypes ?? [])

  const [yy, mm, dd] = today.split('-'); // year = "2025", month = "06", day = "20"

  const [year, setYear] = useState(yy.slice(2)); // "25"
  const [month, setMonth] = useState(mm);        // "06"
  const [day, setDay] = useState(dd);            // "20"
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [openAddMetric, setOpenAddMetric] = React.useState(false)

  // useEffect(() => {
  //   fetchLogs();
  // }, [member.member_id, allTypes]);
  // 처음 allTypes 값으로 localAllTypes 초기화
  useEffect(() => {
    setLocalAllTypes(allTypes ?? [])
  }, [allTypes])

  // localAllTypes가 준비되었을 때만 fetchLogs 실행
  useEffect(() => {
    if (member.member_id && localAllTypes.length > 0) {
      fetchLogs(localAllTypes)
    }
  }, [member.member_id, localAllTypes])


  useEffect(() => {
    try {
      const raw = localStorage.getItem('litpt_member')
      const loggedInMember = raw ? JSON.parse(raw) : null
      if (loggedInMember?.role === 'trainer') {
        setIsTrainer(true)
      }
    } catch (e) {
      console.error('Failed to read login info:', e)
    }
  }, [])

  useEffect(() => {
    if (openAddMetric) {
      fetchAllTypes()
    }
  }, [openAddMetric])

  const isDateWithinLast7Days = (dateStr: string): boolean => {
    const inputDate = new Date(dateStr)
    const today = new Date()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(today.getDate() - 7)
  
    // normalize time to avoid time comparison issues
    inputDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    sevenDaysAgo.setHours(0, 0, 0, 0)
  
    return inputDate >= sevenDaysAgo && inputDate <= today
  }

  const fetchLogs = async (typesOverride?: HealthMetricType[]) => {
    const { data: logsData, error: logError } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('member_id', member.member_id);
  
    if (logError) {
      alert('불러오기 오류: ' + logError.message);
      return;
    }
  
    if (onUpdateLogs) onUpdateLogs(logsData ?? []);
    const typeList = typesOverride ?? localAllTypes
  
    // 고유 날짜 추출 및 정렬
    // const uniqueDates = Array.from(new Set((logsData ?? []).map(l => l.measure_date))).sort();
  
    // orderMap 생성 (상위에서 받은 allTypes 사용)
    const orderMap = new Map<string, { order_target: number; order_type: number }>();
    for (const type of typeList) { // allTypes
      orderMap.set(`${type.metric_target}||${type.metric_type}`, {
        order_target: type.order_target ?? 999,
        order_type: type.order_type ?? 999,
      });
    }
  
    // 정렬된 행 생성
    // const sortedRows = allTypes.slice().sort((a, b) => {
    const sortedRows = typeList.slice().sort((a, b) => {
      const orderA = orderMap.get(`${a.metric_target}||${a.metric_type}`) || { order_target: 999, order_type: 999 };
      const orderB = orderMap.get(`${b.metric_target}||${b.metric_type}`) || { order_target: 999, order_type: 999 };
  
      if (orderA.order_target !== orderB.order_target) {
        return orderA.order_target - orderB.order_target;
      }
      return orderA.order_type - orderB.order_type;
    });
  
    // logMap 생성
    const newLogMap: Record<string, Record<string, { metric_value: number; id?: number }>> = {};
    for (const l of logsData ?? []) {
      const rowKey = `${l.metric_target}||${l.metric_type}`;
      if (!newLogMap[rowKey]) newLogMap[rowKey] = {};
      newLogMap[rowKey][l.measure_date] = {
        metric_value: l.metric_value,
        id: l.health_id,
      };
    }
  
    setDates([...new Set(logsData?.map(l => l.measure_date) ?? [])].sort())
    setRows(sortedRows.map(r => ({ metric_target: r.metric_target, metric_type: r.metric_type })))
    setLogMap(newLogMap)
    setIsEmptyLog((logsData ?? []).length === 0)
  };

  const fetchAllTypes = async () => {
    const { data, error } = await supabase
      .from('health_metric_types')
      .select('health_metric_type_id, metric_target, metric_type, order_target, order_type')
      .order('order_target', { ascending: true })
      .order('order_type', { ascending: true })
  
    if (error) {
      console.error('지표 유형 불러오기 실패:', error)
      return
    }
  
    setLocalAllTypes(data ?? [])
    return data ?? []  
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
      if (!isTrainer && !isDateWithinLast7Days(addingDate)) {
        alert('7일 이내의 날짜만 추가할 수 있습니다 😥');
        return;
      }

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
      const newTypes = await fetchAllTypes() // ✅ 최신 데이터 받아옴
      await fetchLogs(newTypes)  
      if (onRefreshAllTypes) {
        await onRefreshAllTypes()
      } 
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
      await fetchAllTypes()
      fetchLogs()
      if (onRefreshAllTypes) {
        await onRefreshAllTypes()
      }
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
    <>
      <div className="max-w-6xl mx-auto text-gray-700">
          {/* overflow-x-auto로 좌우 스크롤 가능하게 래핑 */}
          <div ref = {scrollRef} className="overflow-auto bg-gray-50 border border-gray-50">
            <table className="table-fixed min-w-max text-sm border-collapse border border-gray-300 bg-gray-50">
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
                                if (!isTrainer && !isDateWithinLast7Days(normalized)) {
                                  alert('7일 이내의 날짜만 추가할 수 있습니다 😥');
                                  return;
                                }
                                if (dates.includes(normalized)) {
                                  alert(`이미 존재하는 날짜입니다: ${normalized} ☹`);
                                  return;
                                }
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

                        const isPastEditable =
                          isTrainer || isDateWithinLast7Days(date);

                        const isDisabled = !isPastEditable;
                        
                        return (
                          <td key={date} className="border px-1 py-1 text-center w-[80px]">
                            <input
                              type="number"
                              className={`
                                w-full text-center border rounded text-sm
                                ${isDisabled
                                  ? 'bg-gray-200 text-gray-600 border-gray-300 cursor-not-allowed'
                                  : logMap[rowKey]?.[date]?.metric_value == null
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
                              disabled={isDisabled}
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
            {isTrainer && (
              <button 
                onClick={() => setOpenAddMetric(true)}
                className="h-9 px-4 text-sm flex items-center gap-1.5 text-gray-600 border-gray-500 hover:bg-gray-100"
              >
                + 지표추가
              </button>
            )}
            
            {/* 날짜 추가 */}
            {addingDate === null && !addingRow && (
              <button
                // variant="outline"
                // size="sm"
                onClick={startAddingDate}
                className="h-9 px-4 text-sm flex items-center gap-1.5 text-yellow-600 border-yellow-500 hover:bg-yellow-100"
              >
                <CalendarPlus size={16} />
              </button>
            )}

            {/* 날짜 추가 취소 */}
            {addingDate && (
              <button
                // variant="outline"
                // size="sm"
                onClick={cancelAddingDate}
                className="h-9 text-sm"
              >
                취소
              </button>
            )}

            {/* 저장/닫기 버튼 */}
            <Button
              onClick={saveAllChanges}
              disabled={!canSave}
              variant="darkGray" 
              className="text-sm"
            >
              저장
            </Button>
            {/* <button 
              onClick={saveAllChanges} 
              disabled={!canSave}
              className="text-sm h-9 px-4 bg-rose-600 text-white font-semibold rounded-full shadow hover:bg-rose-700 transition"
            >
              저장
            </button> */}
            {/* <Button  
              onClick={onClose}
              variant="outline"
              type="button"
              className="h-9 text-sm"
            >
              닫기
            </Button> */}
          </div>
          
          {isTrainer && (
            <AddHealthMetric
              open={openAddMetric}
              onOpenChange={setOpenAddMetric}
              allTypes={localAllTypes}
              newTarget={newTarget}
              newWorkout={newWorkout}
              loading={loadingManage}
              onChangeTarget={setNewTarget}
              onChangeWorkout={setNewWorkout}
              onAdd={handleAddType}
              onDelete={handleDeleteType}
            />
          )}
      </div>
    </>
  )
}