'use client'

import dayjs from 'dayjs';
import { useEffect, useState } from 'react'
import { WorkoutRecord, Member, WorkoutType } from '@/components/members/types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
// import OrderManagementModal from '@/components/members/OrderManagementModal'

type Props = {
  member: Member
  record: WorkoutRecord[]
  logs: WorkoutRecord[]
  onBack: () => void
  showFavoritesOnly?: boolean    
  favorites?: Set<string>   
  favoritesWithOrder?: { key: string, order: number }[]
  allTypes: WorkoutType[];
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

export default function MemberGraphs({ logs: initialLogs, showFavoritesOnly, favorites, favoritesWithOrder, allTypes }: Props) {
  // const [isTrainer, setIsTrainer] = useState(false)
  const [logs, setLogs] = useState<WorkoutRecord[]>([])
  // const [allTypes, setAllTypes] = useState<WorkoutType[]>([]);
  // const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  // const [isAddRecordOpen, setIsAddRecordOpen] = useState(false)
  // const [isListOpen, setIsListOpen] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  // useEffect(() => {
  //   try {
  //     // const raw = localStorage.getItem('litpt_member')
  //     // const loggedInMember = raw ? JSON.parse(raw) : null
  //     // if (loggedInMember?.role === 'trainer') {
  //     //   setIsTrainer(true)
  //     // }
  //   } catch (e) {
  //     console.error('Failed to read login info:', e)
  //   }
  // }, [])
  
  useEffect(() => {
    if (!initialLogs) return;
  
    if (showFavoritesOnly && favorites?.size) {
      const filtered = initialLogs.filter(
        log => favorites.has(`${log.target}||${log.workout}`)
      )
      setLogs(filtered)
    } else {
      setLogs(initialLogs)
    }
  }, [initialLogs, showFavoritesOnly, favorites])
  
  // useEffect(() => {
  //   getWorkoutTypes()
  //     .then(types => {
  //       setAllTypes(types)
  //     })
  //     .catch(console.error)
  // }, [])

  // function fetchWorkoutTypes() {
  //   getWorkoutTypes()
  //     .then(types => setAllTypes(types))
  //     .catch(console.error);
  // }

  // useEffect(() => {
  //   if (isOrderModalOpen) {
  //     fetchWorkoutTypes();
  //   }
  // }, [isOrderModalOpen]);

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
    const workoutMonthMap = new Map<string, T>();
  
    data.forEach((item) => {
      const date = item.workout_date;
      const month = date.slice(0, 7); // YYYY-MM
      const workouts = Object.keys(item).filter((key) => key !== 'workout_date');
  
      workouts.forEach((workout) => {
        const key = `${month}_${workout}`;
        const existing = workoutMonthMap.get(key);
        if (!existing || new Date(date) < new Date(existing.workout_date)) {
          workoutMonthMap.set(key, item);
        }
      });
    });
  
    // Map → 날짜별 그룹핑 (중복 제거)
    const uniqueMap = new Map<string, T>();
    workoutMonthMap.forEach((item) => {
      if (!uniqueMap.has(item.workout_date)) {
        uniqueMap.set(item.workout_date, item);
      } else {
        // 날짜가 같다면 key들을 병합 (workout별 weight 정보)
        const existing = uniqueMap.get(item.workout_date)!;
        const merged = { ...existing, ...item };
        uniqueMap.set(item.workout_date, merged);
      }
    });
  
    return Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
    );
  }
  
  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="space-y-6">
        {targets.length > 0 && (
          <div className="flex items-end gap-4 overflow-x-auto max-w-full">
            <div className="w-[160px]">
              <label className="block text-sm text-gray-600 mb-1">Target</label>
              <select
                value={selectedTarget || ''}
                onChange={(e) => setSelectedTarget(e.target.value || null)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Total</option>
                {targets.map((target) => (
                  <option key={target} value={target}>
                    {target}
                  </option>
                ))}
              </select>
            </div>
          
            <div className="w-[120px] shrink-0">
              <label className="block text-sm text-gray-600 mb-1">View</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'daily' | 'monthly')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
              </select>
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

              const workoutsInGroup = Array.from(new Set(groupLogs.map((log) => log.workout)))
              const allDates = Array.from(new Set(groupLogs.map((log) => log.workout_date))).sort();

              // ⬇️ order_workout 순서로 정렬
              // const sortedWorkouts = workoutsInGroup.sort((a, b) => {
              //   const aOrder = allTypes.find(w => w.workout === a && w.target === target)?.order_workout ?? 999
              //   const bOrder = allTypes.find(w => w.workout === b && w.target === target)?.order_workout ?? 999
              //   return aOrder - bOrder
              // })
              const sortedWorkouts = workoutsInGroup.sort((a, b) => {
                if (showFavoritesOnly && favoritesWithOrder) {
                  const aKey = `${selectedTarget}||${a}`
                  const bKey = `${selectedTarget}||${b}`
                  const aOrder = favoritesWithOrder.find(f => f.key === aKey)?.order ?? 999
                  const bOrder = favoritesWithOrder.find(f => f.key === bKey)?.order ?? 999
                  return aOrder - bOrder
                } else {
                  const aOrder = allTypes.find(w => w.workout === a && w.target === selectedTarget)?.order_workout ?? 999
                  const bOrder = allTypes.find(w => w.workout === b && w.target === selectedTarget)?.order_workout ?? 999
                  return aOrder - bOrder
                }
              })
              
              // 날짜별로 모든 운동 키를 포함한 weightData 생성 (null로 채우기)
              let weightData = allDates.map((date) => {
                const dataForDate = weightDateGrouped[date] || {};
                const filled: Record<string, number | null> = {};
                sortedWorkouts.forEach((workout) => {
                  filled[workout] = dataForDate[workout] ?? null;
                });
                return { date, ...filled };
              });

              // 월별 요약 모드일 경우
              if (viewMode === 'monthly') {
                weightData = getMonthlyFirstData(
                  weightData.map(({ date, ...rest }) => ({ workout_date: date, ...rest }))
                ).map(({ workout_date, ...rest }) => ({ date: workout_date, ...rest }));
              }

              return (
                <div key={target} className="mb-10">
                  <h3 className="text-l font-semibold text-indigo-500 mb-4">{target} Graph</h3>
                  <div className="flex flex-col lg:flex-row gap-6 w-full">
                    <div className="w-full overflow-x-auto">
                      <div className="min-w-[600px]">
                        <h4 className="text-sm text-black font-medium mb-2">Weight (kg)</h4>
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart data={weightData} margin={{ top: 30, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12, fontWeight: 600 }}
                              tickFormatter={(date: string) => {
                                const d = dayjs(date)
                                return viewMode === 'monthly' ? d.format('YY.MM') : d.format('MM.DD')
                              }}
                            />
                            <YAxis tick={{ fontSize: 12, fontWeight: 600 }} />
                            <Tooltip wrapperStyle={{ fontSize: 12 }} labelStyle={{ color: 'black' }} />
                            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                            {sortedWorkouts.map((workout) => (
                              <Line
                                key={workout}
                                type="monotone"
                                dataKey={workout}
                                name={workout}
                                stroke={getColorForWorkout(target, workout)}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                connectNulls={true}
                                label={
                                  viewMode === 'monthly'
                                    ? (props) => (
                                        <text
                                          x={props.x}
                                          y={props.y - 10} // dot보다 위쪽에 표시
                                          fill="#555"
                                          fontSize={12}  
                                          fontWeight="bold" 
                                          textAnchor="middle"
                                        >
                                          {props.value}
                                        </text>
                                      )
                                    : false
                                }
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
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
              // .sort((a, b) => {
              //   const aOrder = allTypes.find(w => w.workout === a && w.target === selectedTarget)?.order_workout ?? 999
              //   const bOrder = allTypes.find(w => w.workout === b && w.target === selectedTarget)?.order_workout ?? 999
              //   return aOrder - bOrder
              // })
              .sort((a, b) => {
                if (showFavoritesOnly && favoritesWithOrder) {
                  const aKey = `${selectedTarget}||${a}`
                  const bKey = `${selectedTarget}||${b}`
                  const aOrder = favoritesWithOrder.find(f => f.key === aKey)?.order ?? 999
                  const bOrder = favoritesWithOrder.find(f => f.key === bKey)?.order ?? 999
                  return aOrder - bOrder
                } else {
                  const aOrder = allTypes.find(w => w.workout === a && w.target === selectedTarget)?.order_workout ?? 999
                  const bOrder = allTypes.find(w => w.workout === b && w.target === selectedTarget)?.order_workout ?? 999
                  return aOrder - bOrder
                }
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
                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[600px]">
                          <h4 className="text-sm text-black font-medium mb-2">Weight (kg)</h4>
                          <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={filtered} margin={{ top: 30, right: 20, bottom: 5, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="workout_date" 
                                tick={{ fontSize: 12, fontWeight: 600 }} 
                                tickFormatter={(date: string) => dayjs(date).format('YY.MM.DD')}
                              />
                              <YAxis tick={{ fontSize: 12, fontWeight: 600 }} />
                              <Tooltip wrapperStyle={{ fontSize: 12 }} labelStyle={{ color: 'black' }} />
                              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                              <Line 
                                type="monotone" 
                                dataKey="weight" 
                                name="Weight" 
                                stroke={color} 
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                connectNulls={true}
                                label={
                                  viewMode === 'monthly'
                                      ? (props) => (
                                          <text
                                          x={props.x}
                                          y={props.y - 10} // dot보다 위쪽에 표시
                                          fill="#555"
                                          fontSize={12}  
                                          fontWeight="bold" 
                                          textAnchor="middle"
                                          >
                                          {props.value}
                                          </text>
                                      )
                                      : false
                                  }
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}
      </div>
    </div>
  )
}
