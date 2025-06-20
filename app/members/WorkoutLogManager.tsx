'use client'

import { CalendarPlus} from 'lucide-react'
import React, { useEffect, useState, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Disclosure } from '@headlessui/react'
import { ChevronUpIcon } from '@heroicons/react/20/solid'
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import dayjs from 'dayjs';

type Member = {
  member_id: number
  name: string
  level: string
  before_level: string
  modified_dt: string
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

// table 드래그 스크롤을 위한 훅
function useHorizontalDragScroll(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      el.classList.add('cursor-grabbing');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
      el.classList.remove('cursor-grabbing');
    };

    const handleMouseUp = () => {
      isDown = false;
      el.classList.remove('cursor-grabbing');
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1; // 스크롤 속도
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('mousemove', handleMouseMove);

    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('mousemove', handleMouseMove);
    };
  }, [containerRef]);
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
  // const [newWorkoutInputs, setNewWorkoutInputs] = useState<Record<string, { weight: string }>>({})
  const [modifiedCells, setModifiedCells] = useState<{ rowKey: string; date: string; weight: number; id?: number }[]>([])
  const hasModifiedCells = modifiedCells.length > 0
  const hasNewLogInputs = addingDate !== null && Object.values(newLogInputs).some(input => Number(input.weight) > 0)
  // const hasNewWorkoutInputs = addingRow && Object.values(newWorkoutInputs).some(input => Number(input.weight) > 0)
  const canSave = hasModifiedCells || hasNewLogInputs //|| hasNewWorkoutInputs
  const supabase = getSupabaseClient()
  const [isEmptyLog, setIsEmptyLog] = useState(false) // 로그 비었는지 여부
  const [disclosureOpen, setDisclosureOpen] = useState(false)
  const [newLevel, setNewLevel] = useState('')
  const [loadingManage, setLoadingManage] = useState(false)
  const [allTypes, setAllTypes] = useState<
    { workout_type_id: number; target: string; workout: string; level: string; order_target: number; order_workout: number }[]
  >([])
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({}); 

  const levelWorkoutsMap = rows.reduce((acc, { level, target, workout }) => {
    if (!acc[level]) acc[level] = new Set()
    acc[level].add(`${target}||${workout}`)
    return acc
  }, {} as Record<string, Set<string>>)

  const beforeSet = levelWorkoutsMap[member.before_level] || new Set()
  const afterSet = levelWorkoutsMap[member.level] || new Set()

  const commonWorkouts = Array.from(
    new Set([...beforeSet].filter((item) => afterSet.has(item)))
  )

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
    
      // if (levelA !== levelB) return levelA - levelB //오름차순
      if (levelA !== levelB) return levelB - levelA  //내림차순
    
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
      [rowKey]: { weight: value },
    }))
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
  
    // ✅ 날짜 중복 검사
    if (addingDate && dates.includes(addingDate)) {
      alert(`이미 존재하는 날짜입니다: ${dayjs(addingDate).format('YYYY-MM-DD')} ☹`)
      return
    }

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
      alert('모든 필드를 입력해주세요 😎')
      return
    }
  
    setLoadingManage(true)
  
    // === Step 1: target 처리 ===
    const existingTarget = allTypes.find(t => t.target === newTarget)
    let order_target: number
  
    if (existingTarget) {
      order_target = existingTarget.order_target
    } else {
      const maxOrder = allTypes.reduce((max, t) => Math.max(max, t.order_target ?? 0), 0)
      order_target = maxOrder + 1
    }
  
    // === Step 2: order_workout 처리 ===
    const sameTargetWorkouts = allTypes.filter(t => t.target === newTarget)
  
    // 동일한 target + workout 조합이 이미 존재하는가?
    const existingWorkout = sameTargetWorkouts.find(t => t.workout === newWorkout)
  
    let order_workout: number
  
    if (existingWorkout) {
      // 기존 workout이면 기존 order_workout 재사용
      order_workout = existingWorkout.order_workout
    } else {
      // 새로운 workout이면 해당 target 내 최대 order_workout + 1
      const maxOrderWorkout = sameTargetWorkouts.reduce((max, t) => Math.max(max, t.order_workout ?? 0), 0)
      order_workout = maxOrderWorkout + 1
    }
  
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
      alert('운동 추가를 완료하였습니다 😊')
      setNewTarget('')
      setNewWorkout('')
      setNewLevel('')
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
    else {
      alert('운동 삭제를 완료하였습니다 😊')
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

  // string -> Date 변환 함수
  const parseDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    const parsed = dayjs(dateStr, 'YYYY-MM-DD');
    return parsed.isValid() ? parsed.toDate() : null;
  };

  // Date -> string 변환 함수
  const formatDate = (date: Date | null): string | null => {
    if (!date) return null;
    return dayjs(date).format('YYYY-MM-DD');
  };

  const handleKeyNavigation = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number,
    totalRows: number,
    totalCols: number
  ) => {
    const getRef = (r: number, c: number) => inputRefs.current[`${r}-${c}`];
    const isValid = (r: number, c: number) => {
      const input = getRef(r, c);
      return input && !input.disabled;
    };
  
    const move = (rDelta: number, cDelta: number) => {
      let r = rowIndex + rDelta;
      let c = colIndex + cDelta;
  
      while (r >= 0 && r < totalRows && c >= 0 && c < totalCols) {
        if (isValid(r, c)) {
          getRef(r, c)?.focus();
          break;
        }
        r += rDelta;
        c += cDelta;
      }
    };
  
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        move(0, 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        move(0, -1);
        break;
      case 'Tab':  
      case 'ArrowDown':
      case 'Enter':
        e.preventDefault();
        move(1, 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(-1, 0);
        break;
      default:
        return;
    }
  };

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
    };

    // 날짜 추가 취소: ESC
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (addingDate) {
          cancelAddingDate(); // 날짜 추가 중이면 취소
        }
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [canSave, addingDate, addingRow, saveAllChanges, startAddingDate, cancelAddingDate]);

  const normalizeDateInput = (input: string): string | null => {
    const digits = input.replace(/[^\d]/g, ''); // 숫자만 추출
  
    if (digits.length === 6) {
      // 250624 → 2025-06-24
      const year = '20' + digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const day = digits.slice(4, 6);
      const formatted = `${year}-${month}-${day}`;
  
      const isValid = dayjs(formatted, 'YYYY-MM-DD', true).isValid();
      return isValid ? formatted : null;
    }
  
    // 이미 YYYY-MM-DD 형태이면 그대로
    if (dayjs(input, 'YYYY-MM-DD', true).isValid()) return input;
  
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div
        className="relative bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] p-6 text-gray-700 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-semibold text-gray-800">운동기록 관리</h2>
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
        <div ref = {scrollRef} className="overflow-auto bg-white border border-white">
          <table className="table-fixed min-w-max text-sm border-collapse border border-gray-300 bg-white">
            <thead className="bg-gray-100 text-gray-700 select-none">
              <tr>
                <th className="border px-2 py-2 text-center font-semibold w-[90px] md:sticky top-0 md:left-0 bg-gray-200 md:z-40">
                  LEVEL
                </th>
                <th className="border px-2 py-2 text-center font-semibold w-[90px] md:sticky top-0 md:left-[90px] bg-gray-200 md:z-30">
                  TARGET
                </th>
                <th className="border px-2 py-2 text-center font-semibold w-[120px] md:sticky top-0 md:left-[180px] bg-gray-200 md:z-20">
                  WORKOUT
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
                  <th className="border px-1 py-1 text-center text-xs font-semibold md:sticky top-0 bg-yellow-50 z-10 w-[80px]">
                    <DatePicker
                      selected={parseDate(addingDate)}
                      onChange={(date: Date | null) => {
                        setAddingDate(formatDate(date));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          const inputValue = input.value;
                          const normalized = normalizeDateInput(inputValue);
                      
                          if (normalized) {
                            const targetCol = dates.length; // setAddingDate로 인해 증가하기 전 인덱스를 미리 저장
                            setAddingDate(normalized);
                            setTimeout(() => {
                              // 다음으로 내려갈 셀 중, 비활성화된 셀은 건너뜀
                              for (let row = 0; row < rows.length; row++) {
                                const nextInput = inputRefs.current[`${row}-${targetCol}`];
                                if (nextInput && !nextInput.disabled) {
                                  nextInput.focus();
                                  break;
                                }
                              }
                            }, 50);
                          }
                        }
                      }}
                      dateFormat="yy.MM.dd"
                      className="text-[12px] w-full text-center border border-gray-300 rounded"
                      placeholderText="yy.mm.dd"
                      open={false}
                      ref={(dp) => {
                        if (dp && 'input' in dp) {
                          const picker = dp as DatePicker;
                          const inputEl = picker.input as HTMLInputElement;
                          if (inputEl && typeof inputEl.focus === 'function') {
                            dateInputRef.current = inputEl;
                          }
                        }
                      }}
                    />
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="bg-white">
              {rows.map(({ target, workout, level }, rowIndex) => {
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
                    <td className="border px-2 py-1 md:sticky left-0 z-30 font-semibold relative pl-6 whitespace-normal bg-gray-50">
                      <span className={`absolute left-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${levelColor}`} />
                      {level}
                    </td>
                    <td className="border px-2 py-1 md:sticky left-[90px] bg-gray-50 z-20 font-semibold whitespace-normal">
                      {target}
                    </td>
                    <td className="border px-2 py-1 md:sticky left-[180px] bg-gray-50 z-10 font-semibold text-sm whitespace-normal">
                      {workout}
                    </td>

                    {/* 날짜별 셀 */}
                    {dates.map((date, colIndex) => {
                      const totalRows = rows.length;
                      const totalCols = dates.length + (addingDate ? 1 : 0);

                      const isBeforeModified = new Date(date) < new Date(member.modified_dt ?? '9999-12-31');
                      const isAfterModified = new Date(date) >= new Date(member.modified_dt ?? '0000-01-01');

                      const isCommonWorkout = commonWorkouts.includes(rowKey);
                      const isBeforeLevelWorkout = level === member.before_level;
                      const isAfterLevelWorkout = level === member.level;

                      const isDisabled =
                        !isCommonWorkout &&
                        ((isBeforeLevelWorkout && !isBeforeModified) ||
                          (isAfterLevelWorkout && !isAfterModified));

                      return (
                        <td key={date} className="border px-1 py-1 text-center w-[80px]">
                          <input
                            type="number"
                            className={`
                              w-full text-center border rounded text-sm
                              ${isDisabled
                                ? 'bg-gray-200 text-gray-600 border-gray-300 cursor-not-allowed'
                                : 'border-gray-200'}
                            `}
                            value={logMap[rowKey]?.[date]?.weight || ''}
                            onChange={(e) =>
                              handleCellChange(rowKey, date, Number(e.target.value))
                            }
                            disabled={isDisabled}
                            onKeyDown={(e) => handleKeyNavigation(e, rowIndex, colIndex, totalRows, totalCols)}
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
                      const isBeforeModified = new Date(addingDate) < new Date(member.modified_dt ?? '9999-12-31');
                      const isAfterModified = new Date(addingDate) >= new Date(member.modified_dt ?? '0000-01-01');
                      const isCommonWorkout = commonWorkouts.includes(rowKey);
                      const isBeforeLevelWorkout = level === member.before_level;
                      const isAfterLevelWorkout = level === member.level;

                      const isDisabled =
                        !isCommonWorkout &&
                        ((isBeforeLevelWorkout && !isBeforeModified) ||
                          (isAfterLevelWorkout && !isAfterModified));

                      return (
                        <td className="border px-1 py-1 text-center bg-yellow-50 w-[80px]">
                          <input
                            type="number"
                            min={0}
                            value={newLogInputs[rowKey]?.weight || ''}
                            onChange={(e) =>
                              handleNewLogInputChange(rowKey, e.target.value)
                            }
                            className={`
                              w-full text-center rounded border text-sm
                              ${isDisabled
                                ? 'bg-gray-200 text-gray-600 border-gray-300 cursor-not-allowed'
                                : 'bg-white border-yellow-400 focus:ring-1 focus:ring-yellow-500'}
                            `}
                            placeholder="-"
                            disabled={isDisabled}
                            onKeyDown={(e) => handleKeyNavigation(e, rowIndex, colIndex, totalRows, totalCols)}
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
