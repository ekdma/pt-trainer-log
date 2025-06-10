'use client'

import { Plus, ArrowLeft, Minus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NewWorkoutRecord, WorkoutRecord, Member } from './types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import AddRecordForm from "./AddRecordOpen"
import WorkoutLogManager from './WorkoutLogManager' 
import { addWorkoutRecordToDB, getWorkoutRecords, deleteWorkoutRecordById } from '../../lib/supabase' // 실제 경로에 맞춰 수정 필요

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

  useEffect(() => {
    setLogs(initialLogs)
  }, [initialLogs])
  
  // 날짜 오름차순 정렬
  const chartData = [...logs].sort((a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime())

  // 전체 Target 목록
  const targets = Array.from(new Set(chartData.map((log) => log.target)))

  // Target별 그룹화
  const targetGroups: Record<string, WorkoutRecord[]> = {}
  chartData.forEach((log) => {
    if (!targetGroups[log.target]) targetGroups[log.target] = []
    targetGroups[log.target].push(log)
  })

  // 선택된 Target 상태, null = 통합 (전체)
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)

  // 기록 추가 모달 열림 여부 상태
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false)
  const [isListOpen, setIsListOpen] = useState(false);
  const [isWorkoutManagerOpen, setIsWorkoutManagerOpen] = useState(false)

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
  

  return (
    <div className="p-4 max-w-screen-lg mx-auto">
      <div className="space-y-6">
        {/* 상단 헤더 + 버튼 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <h2 className="text-xl text-black font-semibold">{member.name} 님의 운동 기록</h2>
          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
            <Button 
              onClick={() => setIsWorkoutManagerOpen(true)}
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
              const repsData = Object.entries(repsDateGrouped).map(([date, workouts]) => ({ date, ...workouts }))

              // 날짜별 Workout별 Weight 집계
              const weightDateGrouped: Record<string, Record<string, number>> = {}
              groupLogs.forEach((log) => {
                if (!weightDateGrouped[log.workout_date]) weightDateGrouped[log.workout_date] = {}
                weightDateGrouped[log.workout_date][log.workout] = log.weight
              })
              const weightData = Object.entries(weightDateGrouped).map(([date, workouts]) => ({ date, ...workouts }))

              const workoutsInGroup = Array.from(new Set(groupLogs.map((log) => log.workout)))

              return (
                <div key={target} className="mb-10">
                  <h3 className="text-l font-semibold text-indigo-500 mb-4">{target} 부위별 그래프</h3>
                  <div className="flex flex-col lg:flex-row gap-6 w-full">
                    {/* Reps 그래프 */}
                    <div className="flex-1">
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
                    </div>

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
            {targetGroups[selectedTarget]?.length === 0 || !targetGroups[selectedTarget] ? (
              <p className="text-center text-gray-500 mt-8">등록된 운동 기록이 없습니다.</p>
            ) : (
              Array.from(new Set(targetGroups[selectedTarget].map((log) => log.workout))).map((workout) => {
                const filtered = chartData.filter((d) => d.workout === workout && d.target === selectedTarget)
                if (filtered.length === 0) return null
                const color = getColorForWorkout(selectedTarget, workout)

                return (
                  <div key={workout} className="mb-8">
                    <p className="text-l font-semibold text-indigo-500 mb-4">{workout}</p>
                    <div className="flex flex-col lg:flex-row gap-6 w-full">
                      {/* Reps 그래프 */}
                      <div className="flex-1">
                        <h4 className="text-sm text-black font-medium mb-2">Reps</h4>
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart data={filtered}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="workout_date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip wrapperStyle={{ fontSize: 12 }} labelStyle={{ color: 'black' }} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line type="monotone" dataKey="reps" name="Reps" stroke={color} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Weight 그래프 */}
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

        {isWorkoutManagerOpen && (
          <WorkoutLogManager
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
