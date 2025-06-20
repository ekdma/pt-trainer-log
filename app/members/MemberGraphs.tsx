'use client'

import { ArrowLeft, NotebookPen, ArrowUpDown } from 'lucide-react'
import { useEffect, useState } from 'react'
// import { NewWorkoutRecord, WorkoutRecord, Member, WorkoutType } from './types'
import { WorkoutRecord, Member, WorkoutType } from './types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
// import AddRecordForm from "./AddRecordOpen"
import WorkoutLogManager from './WorkoutLogManager' 
import OrderManagementModal from './OrderManagementModal'
// import { addWorkoutRecordToDB, getWorkoutRecords, deleteWorkoutRecordById, getWorkoutTypes } from '../../lib/supabase' // 실제 경로에 맞춰 수정 필요
import { getWorkoutTypes } from '../../lib/supabase' // 실제 경로에 맞춰 수정 필요

type Props = {
  member: Member
  record: WorkoutRecord[]
  logs: WorkoutRecord[]
  onBack: () => void
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
  const [allTypes, setAllTypes] = useState<WorkoutType[]>([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  // const [isAddRecordOpen, setIsAddRecordOpen] = useState(false)
  // const [isListOpen, setIsListOpen] = useState(false)
  const [isWorkoutManagerOpen, setIsWorkoutManagerOpen] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    setLogs(initialLogs)
  }, [initialLogs])
  
  useEffect(() => {
    getWorkoutTypes()
      .then(types => {
        setAllTypes(types)
      })
      .catch(console.error)
  }, [])

  function fetchWorkoutTypes() {
    getWorkoutTypes()
      .then(types => setAllTypes(types))
      .catch(console.error);
  }

  useEffect(() => {
    if (isOrderModalOpen) {
      fetchWorkoutTypes();
    }
  }, [isOrderModalOpen]);

  // 날짜 오름차순 정렬
  const chartData = [...logs].sort((a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime())

  // 전체 Target 목록
  const targets = Array.from(
    new Set(chartData.map((log) => log.target))
  ).sort((a, b) => {
    const aOrder = allTypes.find(w => w.target === a)?.order_target ?? 999
    const bOrder = allTypes.find(w => w.target === b)?.order_target ?? 999
    return aOrder - bOrder
  })

  // Target별 그룹화
  const targetGroups: Record<string, WorkoutRecord[]> = {}
  chartData.forEach((log) => {
    if (!targetGroups[log.target]) targetGroups[log.target] = []
    targetGroups[log.target].push(log)
  })

  // ✅ 월 단위 데이터 필터링 함수
  function getMonthlyFirstData<T extends { workout_date: string }>(data: T[]): T[] {
    const monthMap = new Map<string, T>();
    data.forEach((item) => {
      const monthKey = item.workout_date.slice(0, 7); // YYYY-MM
      if (
        !monthMap.has(monthKey) ||
        new Date(item.workout_date) < new Date(monthMap.get(monthKey)!.workout_date)
      ) {
        monthMap.set(monthKey, item);
      }
    });
    return Array.from(monthMap.values());
  }

  return (
    <div className="p-4 max-w-screen-lg mx-auto">
      <div className="space-y-6">
        {/* 상단 헤더 + 버튼 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <h2 className="text-xl text-black font-semibold">{member.name} 님의 운동 기록</h2>
          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
            <Button 
              className="w-full sm:w-auto flex items-center gap-1 text-sm text-gray-600 border border-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition duration-200"
              onClick={() => setIsOrderModalOpen(true)}
            >
              <ArrowUpDown size={16} />
              순서관리
            </Button>
            <Button 
              onClick={() => setIsWorkoutManagerOpen(true)}
              className="w-full sm:w-auto flex items-center gap-1 text-sm text-violet-600 border border-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition duration-200"
            > 
              <NotebookPen size={16} />
              기록관리
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

        {targets.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            {/* Target 선택 버튼들 */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTarget(null)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm ${
                  selectedTarget === null
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white text-gray-700 hover:bg-indigo-50 border-gray-300'
                }`}
              >
                통합
              </button>
              {targets.map((target) => (
                <button
                  key={target}
                  onClick={() => setSelectedTarget(target)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm ${
                    selectedTarget === target
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-white text-gray-700 hover:bg-indigo-50 border-gray-300'
                  }`}
                >
                  {target}
                </button>
              ))}
            </div>

            {/* 일/월 단위 버튼 */}
            <div className="flex">
              <div className="inline-flex rounded-md shadow-sm border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setViewMode('daily')}
                  className={`px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                    viewMode === 'daily'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  일 단위
                </button>
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                    viewMode === 'monthly'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  월 단위
                </button>
              </div>
            </div>
          </div>
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
              
              const weightDateGrouped: Record<string, Record<string, number>> = {}
              groupLogs.forEach((log) => {
                if (!weightDateGrouped[log.workout_date]) weightDateGrouped[log.workout_date] = {}
                weightDateGrouped[log.workout_date][log.workout] = log.weight
              })

              let weightData = Object.entries(weightDateGrouped).map(([date, workouts]) => ({ date, ...workouts }));
              if (viewMode === 'monthly') {
                weightData = getMonthlyFirstData(
                  weightData.map((d) => {
                    const { date, ...rest } = d;
                    return { workout_date: date, ...rest };
                  })
                ).map(({ workout_date, ...rest }) => ({ date: workout_date, ...rest }));
              }
              const workoutsInGroup = Array.from(new Set(groupLogs.map((log) => log.workout)))
              
              // ⬇️ order_workout 순서로 정렬
              const sortedWorkouts = workoutsInGroup.sort((a, b) => {
                const aOrder = allTypes.find(w => w.workout === a && w.target === target)?.order_workout ?? 999
                const bOrder = allTypes.find(w => w.workout === b && w.target === target)?.order_workout ?? 999
                return aOrder - bOrder
              })

              return (
                <div key={target} className="mb-10">
                  <h3 className="text-l font-semibold text-indigo-500 mb-4">{target} 부위별 그래프</h3>
                  <div className="flex flex-col lg:flex-row gap-6 w-full">
                    <div className="flex-1">
                      <h4 className="text-sm text-black font-medium mb-2">Weight (kg)</h4>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={weightData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip wrapperStyle={{ fontSize: 12 }} labelStyle={{ color: 'black' }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          {sortedWorkouts.map((workout) => (
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
            {targetGroups[selectedTarget]?.length === 0 || !targetGroups[selectedTarget] ? (
              <p className="text-center text-gray-500 mt-8">등록된 운동 기록이 없습니다.</p>
            ) : (
              Array.from(new Set(targetGroups[selectedTarget].map((log) => log.workout)))
              .sort((a, b) => {
                const aOrder = allTypes.find(w => w.workout === a && w.target === selectedTarget)?.order_workout ?? 999
                const bOrder = allTypes.find(w => w.workout === b && w.target === selectedTarget)?.order_workout ?? 999
                return aOrder - bOrder
              })
              .map((workout) => {
                let filtered = chartData.filter((d) => d.workout === workout && d.target === selectedTarget);
                if (viewMode === 'monthly') {
                  filtered = getMonthlyFirstData(filtered);
                }
                if (filtered.length === 0) return null

                const color = getColorForWorkout(selectedTarget, workout)

                return (
                  <div key={workout} className="mb-8">
                    <p className="text-l font-semibold text-indigo-500 mb-4">{workout}</p>
                    <div className="flex flex-col lg:flex-row gap-6 w-full">
                      <div className="flex-1">
                        <h4 className="text-sm text-black font-medium mb-2">Weight (kg)</h4>
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart data={filtered}>
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
              })
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
            member={member}
            logs={logs}
            onClose={() => setIsWorkoutManagerOpen(false)}
            onUpdateLogs={(updatedLogs) => setLogs(updatedLogs)}
          />
        )}
      </div>
    </div>
  )
}
