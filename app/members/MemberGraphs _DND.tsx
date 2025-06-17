'use client'

import { Plus, ArrowLeft, Minus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NewWorkoutRecord, WorkoutRecord, Member, WorkoutType  } from './types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import AddRecordForm from "./AddRecordOpen"
import WorkoutLogManager from './WorkoutLogManager'
import OrderManagementModal from './OrderManagementModal'
import { addWorkoutRecordToDB, getWorkoutRecords, deleteWorkoutRecordById, getWorkoutTypes } from '../../lib/supabase' // 실제 경로에 맞춰 수정 필요

// DnD-kit 관련 임포트
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'

import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'

import { CSS } from '@dnd-kit/utilities'

type Props = {
  member: Member
  record: WorkoutRecord[]
  logs: WorkoutRecord[]
  workoutTypes: WorkoutType[];  // ← 추가
  onBack: () => void
}

function SortableTargetButton({
  id,
  children,
  selected,
  onClick,
}: {
  id: string
  children: React.ReactNode
  selected: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
        selected ? 'bg-blue-600 text-white shadow-md border-transparent' : 'bg-white text-gray-700 border-gray-300'
      }`}
    >
      <span className="cursor-grab">≡</span> {/* 핸들 표시 */}
      {children}
    </button>
  )
}

function SortableWorkoutButton({ id, workout, color, data }: { id: string, workout: string, color: string, data: WorkoutRecord[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
    opacity: isDragging ? 0.5 : 1,
    userSelect: 'none',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '12px',
    backgroundColor: 'white',
    boxShadow: isDragging ? '0 0 10px rgba(0,0,0,0.3)' : undefined,
  }
    
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <p className="text-l font-semibold text-indigo-500 mb-4">{workout}</p>
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        <div className="flex-1">
          <h4 className="text-sm text-black font-medium mb-2">Weight (kg)</h4>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="workout_date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip wrapperStyle={{ fontSize: 12 }} labelStyle={{ color: 'black' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="weight" name="Weight" stroke={color} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// Base colors per target muscle group (hex)
const targetColorMap: Record<string, string> = {
  Leg: '#ff4d4d',
  Back: '#ffcc00',
  Shoulder: '#66cc66',
  Chest: '#ff66cc',
  Arm: '#3399ff',
  Core: '#ea9999',
}

// 헥스 -> HSL 변환
function hexToHSL(H: string) {
  // Convert hex to RGB first
  let r = 0, g = 0, b = 0
  if (H.length === 4) {
    r = parseInt(H[1] + H[1], 16)
    g = parseInt(H[2] + H[2], 16)
    b = parseInt(H[3] + H[3], 16)
  } else if (H.length === 7) {
    r = parseInt(H.substring(1, 3), 16)
    g = parseInt(H.substring(3, 5), 16)
    b = parseInt(H.substring(5, 7), 16)
  }

  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255
  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break
      case gNorm: h = (bNorm - rNorm) / d + 2; break
      case bNorm: h = (rNorm - gNorm) / d + 4; break
    }
    h /= 6
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

// HSL -> 헥스 변환
function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0

  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  const rFinal = Math.round((r + m) * 255)
  const gFinal = Math.round((g + m) * 255)
  const bFinal = Math.round((b + m) * 255)

  const toHex = (v: number) => v.toString(16).padStart(2, '0')
  return `#${toHex(rFinal)}${toHex(gFinal)}${toHex(bFinal)}`
}


// Workout 별로 Base Color에서 명도와 채도를 변형해서 색상 부여
const usedColors: Record<string, Record<string, string>> = {}

function getColorForWorkout(target: string, workout: string) {
  if (!usedColors[target]) usedColors[target] = {}
  const targetColors = usedColors[target]

  if (targetColors[workout]) return targetColors[workout]

  const baseHex = targetColorMap[target] || '#8884d8'
  const { h, s, l } = hexToHSL(baseHex)

  // Workout별로 조금씩 다른 명도와 채도 적용 (workout 문자열 해시로 변환)
  const hash = workout
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)

  // 명도, 채도 범위 조절 (예시)
  const newS = Math.min(100, Math.max(30, s + (hash % 50) - 25)) // +/-10 범위 내 변동
  const newL = Math.min(80, Math.max(30, l + (hash % 40) - 20)) // +/-7 범위 내 변동

  const newColor = hslToHex(h, newS, newL)
  targetColors[workout] = newColor
  return newColor
}


export default function MemberGraphs({ member, logs: initialLogs, onBack }: Props) {
  const [logs, setLogs] = useState<WorkoutRecord[]>([])
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([])

  useEffect(() => {
    setLogs(initialLogs)
  }, [initialLogs])

  useEffect(() => {
    setWorkoutTypes(workoutTypes.sort((a, b) => (a.order_target ?? 999) - (b.order_target ?? 999)))
  }, [workoutTypes])
  
  // 날짜 오름차순 정렬
  const chartData = [...logs].sort((a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime())
  const [targets, setTargets] = useState<string[]>(['Leg', 'Back', 'Shoulder', 'Chest', 'Arm', 'Core'])
  
  // state로 target 순서 관리 (드래그앤드롭 후 순서 변경)
  const [targetOrder, setTargetOrder] = useState<string[]>(['Leg', 'Back', 'Shoulder', 'Chest', 'Arm', 'Core'])

  const uniqueTargets = Array.from(
    new Set(workoutTypes.map((wt) => wt.target))
  )
  
  const orderedTargetList = uniqueTargets.sort((a, b) => {
    const orderA = workoutTypes.find(wt => wt.target === a)?.order_target ?? 999
    const orderB = workoutTypes.find(wt => wt.target === b)?.order_target ?? 999
    return orderA - orderB
  })

  const actualTargets = Array.from(new Set(chartData.map((log) => log.target)))
  const displayTargets = orderedTargetList.filter((t) => actualTargets.includes(t))
  // const targets = Array.from(new Set(chartData.map((log) => log.target)))

  // Target별 그룹화
  const targetGroups: Record<string, WorkoutRecord[]> = {}
  chartData.forEach((log) => {
    if (!targetGroups[log.target]) targetGroups[log.target] = []
    targetGroups[log.target].push(log)
  })

  // 선택된 Target 상태, null = 통합 (전체)
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)

  // state로 workout 그래프 순서 관리 (선택된 target 안에 있는 workout들)
  const [workoutOrder, setWorkoutOrder] = useState<string[]>([])

  // 선택된 target 변경 시 workout 순서 초기화
  useEffect(() => {
    if (selectedTarget === null) {
      setWorkoutOrder([])
      return
    }
  
    const workouts = Array.from(new Set(targetGroups[selectedTarget]?.map(w => w.workout) || []))
    const ordered = workouts.sort((a, b) => {
      const orderA = workoutTypes.find(wt => wt.workout === a && wt.target === selectedTarget)?.order_workout ?? 999
      const orderB = workoutTypes.find(wt => wt.workout === b && wt.target === selectedTarget)?.order_workout ?? 999
      return orderA - orderB
    })
  
    setWorkoutOrder(ordered)
  }, [selectedTarget, workoutTypes])
  

  // DnD-kit sensor 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,  // 5px 움직여야 드래그 시작
      },
    })
  )

  // Target 버튼 리스트 드래그 종료 시
  function handleTargetDragEnd(event: any) {
    const { active, over } = event
    if (active.id !== over?.id) {
      setTargetOrder((items) => {
        const oldIndex = items.indexOf(active.id)
        const newIndex = items.indexOf(over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  // Workout 그래프 리스트 드래그 종료 시
  function handleWorkoutDragEnd(event: any) {
    const { active, over } = event
    if (active.id !== over.id) {
      const oldIndex = workoutOrder.indexOf(active.id)
      const newIndex = workoutOrder.indexOf(over.id)
      const newOrder = arrayMove(workoutOrder, oldIndex, newIndex)
      setWorkoutOrder(newOrder)
    }
  }

  function fetchWorkoutTypes() {
    getWorkoutTypes()
      .then(types => setAllTypes(types))
      .catch(console.error);
  }

  const handleSaveOrder = (newTargetOrder: string[], newWorkoutOrder: string[]) => {
    setTargetOrder(newTargetOrder)
    setWorkoutOrder(newWorkoutOrder)
    setIsOrderModalOpen(false)
  }
  
  // workout 그래프 렌더링 시 workoutOrder 순서로 정렬
  const sortedWorkoutOrder = workoutOrder.length > 0 ? workoutOrder : []
  
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [allTypes, setAllTypes] = useState<WorkoutType[]>([]);

  // order_target, order_workout 상태는 백엔드에서 fetch or props로 받아온다고 가정
  // 여기서는 임시 state로 관리 (초기값은 기존 targetOrder, workoutOrder와 다름)
  const [orderTarget, setOrderTarget] = useState<string[]>(['Leg', 'Back', 'Shoulder', 'Chest', 'Arm', 'Core'])
  const [orderWorkout, setOrderWorkout] = useState<string[]>([]) // 선택된 target에 따라 달라지므로 초기 빈 배열

  // 선택된 target이 바뀔 때 orderWorkout도 재설정
  useEffect(() => {
    if (selectedTarget === null) {
      setOrderWorkout([])
      return
    }
    // order_workout을 백엔드에서 fetch or 초기화 필요. 임시로 필터링한 값 정렬해서 세팅
    const workouts = Array.from(new Set(targetGroups[selectedTarget]?.map(w => w.workout) || []))
    setOrderWorkout(workouts.sort())
  }, [selectedTarget])


  // 기록 추가 모달 열림 여부 상태
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false)
  const [isListOpen, setIsListOpen] = useState(false);
  const [isWorkoutManagerOpen, setIsWorkoutManagerOpen] = useState(false)
  const [workoutManagerKey, setWorkoutManagerKey] = useState(0);

  // 기록 추가 완료 콜백 예시 (부모 컴포넌트에서 실제 저장 처리할 수도 있음)
  const handleAddRecord = async (newRecord: NewWorkoutRecord): Promise<void> => {
    try {
      await addWorkoutRecordToDB(newRecord)
      const updatedLogs = await getWorkoutRecords(member.member_id.toString())
  
      // [1] 정렬된 상태로 업데이트
      const sortedLogs = updatedLogs.sort(
        (a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
      )
      setLogs(sortedLogs)
  
      // [2] 해당 운동의 타겟 탭 자동 선택
      setSelectedTarget(newRecord.target)
  
      // [3] 모달 닫기
      setIsAddRecordOpen(false)
      alert('기록 저장을 완료하였습니다 😊')
    } catch (error) {
      console.error('기록 저장 실패:', error)
      alert('기록 저장 중 문제가 발생했어요 😥')
    }
  }
  

  const handleDelete = async (id: number) => {
    if (!confirm('해당 기록을 삭제하시겠습니까?')) return;
    try {
      await deleteWorkoutRecordById(id);
      const updated = await getWorkoutRecords(member.member_id.toString());
  
      // 정렬된 상태로 설정
      const sorted = updated.sort(
        (a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
      )
      setLogs(sorted);
  
      alert('기록 삭제를 완료하였습니다 😊');
    } catch (e) {
      console.error('삭제 중 오류:', e);
      alert('삭제 중 문제가 발생했어요 😥');
    }
  };
  
  useEffect(() => {
    async function fetchWorkoutTypes() {
      try {
        const types = await getWorkoutTypes();
        setAllTypes(types);
      } catch (error) {
        console.error('Failed to fetch workout types:', error);
      }
    }
    fetchWorkoutTypes();
  }, []);

  return (
    <div className="p-4 max-w-screen-lg mx-auto">
      <div className="space-y-6">
        {/* 상단 헤더 + 버튼 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <h2 className="text-xl text-black font-semibold">{member.name} 님의 운동 기록</h2>
          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
            <Button 
              className="w-full sm:w-auto flex items-center gap-1 text-sm text-yellow-600 border border-yellow-600 px-3 py-1.5 rounded-lg hover:bg-yellow-100 transition duration-200"
              onClick={() => setIsOrderModalOpen(true)}
            >
              순서관리
            </Button>
            <Button 
              onClick={() => {
                setWorkoutManagerKey(prev => prev + 1); // key 변경 → 강제 재마운트
                setIsWorkoutManagerOpen(true);
              }}
              className="w-full sm:w-auto flex items-center gap-1 text-sm text-purple-600 border border-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition duration-200"
            >
              기록관리
            </Button>
            <Button 
              onClick={() => setIsAddRecordOpen(true)}
              className="w-full sm:w-auto flex items-center gap-1 text-sm text-green-600 border border-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 transition duration-200"
            >
              <Plus size={16} />
              기록 추가
            </Button>
            <Button 
              onClick={() => setIsListOpen(true)} 
              className="w-full sm:w-auto flex items-center gap-1 text-sm text-red-600 border border-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition duration-200"
            >
              <Minus size={16} />
              기록 삭제
            </Button>
            <Button
              onClick={onBack}
              className="w-full sm:w-auto flex items-center gap-1 text-sm text-indigo-600 border border-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition duration-200"
            >
              <ArrowLeft size={16} />
              뒤로
            </Button>
          </div>
        </div>

        {/* Target 선택 버튼 그룹 */}
        {targets.length > 0 && (
          <>
            <div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => {
                  const { active, over } = event
                  if (!over) return

                  const activeId = String(active.id)
                  const overId = String(over.id)

                  if (activeId !== overId) {
                    const oldIndex = targets.indexOf(activeId)
                    const newIndex = targets.indexOf(overId)
                    const newArr = arrayMove(targets, oldIndex, newIndex)
                    setTargets(newArr)
                    if (!newArr.includes(selectedTarget ?? "")) {
                      setSelectedTarget(null)
                    }
                  }
                }}
              >
                <SortableContext
                  items={targets}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="mb-6 flex flex-wrap gap-2">
                    {targets.map((t) => (
                      <SortableTargetButton
                        key={t}
                        id={t}
                        selected={selectedTarget === t}
                        onClick={() => setSelectedTarget(t)}
                      >
                        {t}
                      </SortableTargetButton>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTarget(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition duration-150 border ${
                  selectedTarget === null
                    ? 'bg-blue-600 text-white shadow-md border-transparent'
                    : 'bg-white text-gray-700 hover:bg-blue-50 border-gray-300'
                }`}
              >
                통합
              </button>
              {targets.map((target) => (
                <button
                  key={target}
                  onClick={() => setSelectedTarget(target)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition duration-150 border ${
                    selectedTarget === target
                      ? 'bg-blue-600 text-white shadow-md border-transparent'
                      : 'bg-white text-gray-700 hover:bg-blue-50 border-gray-300'
                  }`}
                >
                  {target}
                </button>
              ))}
            </div>
          </>
        )}


        {/* 렌더링 */}
        {selectedTarget === null ? (
          // 통합 모드
          targets.length === 0 ? (
            <p className="text-center text-gray-500 mt-8">등록된 운동 기록이 없습니다.</p>
          ) : (
            targets.map((target) => {
              const groupLogs = targetGroups[target]
              if (!groupLogs || groupLogs.length === 0) return null

              // 날짜별 Workout별 Reps 집계
              const repsDateGrouped: Record<string, Record<string, number>> = {}
              groupLogs.forEach((log) => {
                if (!repsDateGrouped[log.workout_date]) repsDateGrouped[log.workout_date] = {}
                repsDateGrouped[log.workout_date][log.workout] = log.reps
              })
              // const repsData = Object.entries(repsDateGrouped).map(([date, workouts]) => ({ date, ...workouts }))

              // 날짜별 Workout별 Weight 집계
              const weightDateGrouped: Record<string, Record<string, number>> = {}
              groupLogs.forEach((log) => {
                if (!weightDateGrouped[log.workout_date]) weightDateGrouped[log.workout_date] = {}
                weightDateGrouped[log.workout_date][log.workout] = log.weight
              })
              const weightData = Object.entries(weightDateGrouped).map(([date, workouts]) => ({ date, ...workouts }))

              const workoutsInGroup = Array.from(new Set(groupLogs.map((log) => log.workout))).sort((a, b) => {
                const orderA = workoutTypes.find(wt => wt.workout === a && wt.target === target)?.order_workout ?? 999
                const orderB = workoutTypes.find(wt => wt.workout === b && wt.target === target)?.order_workout ?? 999
                return orderA - orderB
              })

              return (
                <div key={target} className="mb-10">
                  <h3 className="text-l font-semibold text-indigo-500 mb-4">{target} 부위별 그래프</h3>
                  <div className="flex flex-col lg:flex-row gap-6 w-full">
                    {/* Reps 그래프 */}
                    {/* <div className="flex-1">
                      <h4 className="text-sm text-black font-medium mb-2">Reps</h4>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={repsData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip wrapperStyle={{ fontSize: 12 }} labelStyle={{ color: 'black' }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          {workoutsInGroup.map((workout) => (
                            <Line
                              key={workout}
                              type="monotone"
                              dataKey={workout}
                              name={workout}
                              stroke={getColorForWorkout(target, workout)}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div> */}

                    {/* Weight 그래프 */}
                    <div className="flex-1">
                      <h4 className="text-sm text-black font-medium mb-2">Weight (kg)</h4>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={weightData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip wrapperStyle={{ fontSize: 12 }} labelStyle={{ color: 'black' }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          {workoutsInGroup.map((workout) => (
                            <Line
                              key={workout}
                              type="monotone"
                              dataKey={workout}
                              name={workout}
                              stroke={getColorForWorkout(target, workout)}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )
            })
          )
        ) : (
          // 특정 Target 선택 모드
          <>
            {(!targetGroups[selectedTarget] ||
              targetGroups[selectedTarget].length === 0) && (
              <p className="text-center text-gray-500 mt-8">
                등록된 운동 기록이 없습니다.
              </p>
            )}
            {targetGroups[selectedTarget] && targetGroups[selectedTarget].length > 0 && (
              <>
                {/* 운동명 버튼 드래그영역 */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleWorkoutDragEnd}
                >
                  <SortableContext
                    items={workoutOrder}  
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="mb-6 flex flex-wrap gap-2">
                      {workoutOrder.map((workout) => (
                        <SortableWorkoutButton
                          key={workout}
                          id={workout}
                          workout={workout}
                          color={getColorForWorkout(selectedTarget, workout)}
                          data={targetGroups[selectedTarget].filter(log => log.workout === workout)}
                          // onClick={() => { /* ... */ }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* 선택된 target + workouts 순서대로 그래프 렌더링 */}
                {workoutOrder.map((workout) => {
                  // 선택한 target + workout 로그 필터링
                  const filteredLogs = targetGroups[selectedTarget].filter(
                    (log) => log.workout === workout
                  )

                  // 날짜별 weight 정리
                  const dateWeightMap: Record<string, number> = {}
                  filteredLogs.forEach((log) => {
                    dateWeightMap[log.workout_date] = log.weight
                  })
                  const weightData = Object.entries(dateWeightMap).map(
                    ([date, weight]) => ({ date, weight })
                  )

                  return (
                    <div key={workout} className="mb-10">
                      <h3 className="text-l font-semibold text-indigo-500 mb-4">
                        {selectedTarget} - {workout} 그래프
                      </h3>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={weightData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip
                            wrapperStyle={{ fontSize: 12 }}
                            labelStyle={{ color: "black" }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line
                            type="monotone"
                            dataKey="weight"
                            name="Weight (kg)"
                            stroke={getColorForWorkout(selectedTarget, workout)}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}

        {isOrderModalOpen && (
          <OrderManagementModal
            isOpen={isOrderModalOpen}
            onClose={() => setIsOrderModalOpen(false)}
            allTypes={allTypes}
            onRefreshAllTypes={fetchWorkoutTypes}  // ✅ 여기 추가
          />
        )}

        {isWorkoutManagerOpen && (
          <WorkoutLogManager
            key={workoutManagerKey}
            member={member}
            logs={logs}
            onClose={() => setIsWorkoutManagerOpen(false)}
            onUpdateLogs={(updatedLogs) => setLogs(updatedLogs)}
          />
        )}

        {/* 기록 추가 모달 */}
        {isAddRecordOpen && (
          <AddRecordForm
            member={member}
            onCancel={() => setIsAddRecordOpen(false)}
            onSave={handleAddRecord}
          />
        )}

        {/* 기록 리스트 + 삭제 */}
        {isListOpen && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5 border border-gray-100 max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-red-600 border-b pb-2">운동 기록 삭제</h3>

              {/* 운동 기록 리스트 */}
              {logs.length === 0 ? (
                <p className="text-sm text-gray-500">삭제할 운동 기록이 없습니다.</p>
              ) : (
                <ul className="space-y-3">
                  {logs.map(log => (
                    <li
                      key={log.workout_id}
                      className="flex justify-between items-center border rounded-lg px-3 py-2 bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <div className="text-sm text-gray-700">
                        <strong className="text-gray-900">{log.workout}</strong> | {log.weight} / {' '} {log.reps} | {' '}
                        <span className="text-gray-500">{log.workout_date.slice(0, 10)}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(log.workout_id)}
                        className="text-xs"
                      >
                        삭제
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {/* 닫기 버튼 */}
              <div className="flex justify-end pt-4">
                <Button onClick={() => setIsListOpen(false)} className="text-gray-700 text-sm" variant="outline">
                  닫기
                </Button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  )
}
