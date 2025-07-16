'use client'

import { Utensils, Dumbbell, Salad } from 'lucide-react'
import { useState, useEffect } from 'react'
import MemberSearch from './MemberSearch'
import MemberGraphs from './MemberGraphs'
import MemberHealthGraphs from './MemberHealthGraphs'
import type { Member, WorkoutRecord, HealthMetric } from './types'
import { fetchWorkoutLogs, fetchHealthLogs } from '../../utils/fetchLogs'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { useRouter } from 'next/navigation'

export default function MembersPage() {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutRecord[]>([])
  const [healthLogs, setHealthLogs] = useState<HealthMetric[]>([])
  const [activeTab, setActiveTab] = useState<'workout' | 'health' | 'food'>('workout')
  // const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([]);
  const router = useRouter()

  useAuthGuard()

  useEffect(() => {
    const fetchLogs = async () => {
      if (!selectedMember) return

      if (activeTab === 'workout') {
        const logs = await fetchWorkoutLogs(selectedMember.member_id)
        setWorkoutLogs(logs)
      } else {
        const logs = await fetchHealthLogs(selectedMember.member_id)
        setHealthLogs(logs)
      }
    }

    fetchLogs()
  }, [activeTab, selectedMember])

  const navigateTo = (tab: typeof activeTab) => {
    setActiveTab(tab)
    if (tab === 'food' && selectedMember) {
      const params = new URLSearchParams({
        memberId: String(selectedMember.member_id),
        memberName: selectedMember.name,
      })
      router.push(`/food-diary?${params.toString()}`)
    }
  }

  return (
    <main className="flex min-h-screen flex-col p-6 bg-gray-50 overflow-auto">
      <div className="p-4 w-full max-w-screen-2xl mx-auto">
        {selectedMember ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">
                {selectedMember.name} 님
              </h2>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                className={`flex items-center gap-1 text-sm px-4 py-2 rounded-lg border transition duration-200 ${
                  activeTab === 'workout'
                    ? 'bg-blue-100 border-blue-600 text-blue-700 font-semibold'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('workout')}
              >
                <Dumbbell size={16} /> 운동기록
              </button>
              <button
                className={`flex items-center gap-1 text-sm px-4 py-2 rounded-lg border transition duration-200 ${
                  activeTab === 'health'
                    ? 'bg-pink-100 border-pink-600 text-pink-700 font-semibold'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('health')}
              >
                <Salad size={16} /> 건강지표
              </button>
              <button
                className={`flex items-center gap-1 text-sm px-4 py-2 rounded-lg border transition duration-200 ${
                  activeTab === 'food'
                    ? 'bg-green-100 border-green-600 text-green-700 font-semibold'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => navigateTo('food')}
              >
                <Utensils size={16} /> 식단일지
              </button>
            </div>

            {activeTab === 'workout' ? (
              <MemberGraphs
                member={selectedMember}
                record={workoutLogs.filter(log => log.member_id === selectedMember.member_id)}
                logs={workoutLogs.filter(log => log.member_id === selectedMember.member_id)}
                // workoutTypes={workoutTypes}
                // setWorkoutTypes={setWorkoutTypes} // ✅ 추가
                onBack={() => setSelectedMember(null)}
              />
            ) : (
              <MemberHealthGraphs
                member={selectedMember}
                healthLogs={healthLogs.filter(log => log.member_id === selectedMember.member_id)}
                onBack={() => setSelectedMember(null)}
              />
            )}
          </>
        ) : (
          <MemberSearch
            onSelectMember={(member) => {
              setSelectedMember(member)
              setActiveTab('workout')
            }}
            onSetLogs={setWorkoutLogs}
            onSetHealthLogs={setHealthLogs}
          />
        )}
      </div>
    </main>
  )
}
