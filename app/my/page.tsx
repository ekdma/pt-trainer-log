'use client'

import { Dumbbell, Salad } from 'lucide-react'
import { useState, useEffect } from 'react'
import MemberSearch from '@/app/members/MemberSearch'
import MemberGraphs from '@/app/members/MemberGraphs'
import MemberHealthGraphs from '@/app/members/MemberHealthGraphs'
import type { Member, WorkoutRecord, HealthMetric } from '@/app/members/types'
import { fetchWorkoutLogs, fetchHealthLogs } from '../../utils/fetchLogs'
import { useRouter } from 'next/navigation'
import { useAuthGuard } from '@/hooks/useAuthGuard'

export default function MembersPage() {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutRecord[]>([])
  const [healthLogs, setHealthLogs] = useState<HealthMetric[]>([])
  const [activeTab, setActiveTab] = useState<'workout' | 'health'>('workout')
  const [isTrainer, setIsTrainer] = useState<boolean>(true)

  const router = useRouter()

  useAuthGuard()
  
  // 🔐 로그인한 사용자 정보에서 member 설정
  useEffect(() => {
    const initializeMember = async () => {
      try {
        const raw = localStorage.getItem('litpt_member')
        const member = raw ? JSON.parse(raw) : null

        if (member) {
          setSelectedMember(member)
          setIsTrainer(member.role === 'trainer')
        }
      } catch (e) {
        console.error('회원 정보 파싱 오류:', e)
      }
    }

    initializeMember()
  }, [])

  // ✅ 탭 전환 또는 member 변경 시 로그 가져오기
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
            </div>

            {activeTab === 'workout' ? (
              <MemberGraphs
                member={selectedMember}
                record={workoutLogs}
                logs={workoutLogs}
                onBack={() => {
                  if (isTrainer) {
                    setSelectedMember(null)
                  }
                }}
              />
            ) : (
              <MemberHealthGraphs
                member={selectedMember}
                healthLogs={healthLogs}
                onBack={() => {
                  if (isTrainer) {
                    setSelectedMember(null)
                  }
                }}
              />
            )}
          </>
        ) : (
          // 트레이너만 회원 검색 가능
          isTrainer && (
            <MemberSearch
              onSelectMember={(member) => {
                setSelectedMember(member)
                setActiveTab('workout')
              }}
              onSetLogs={setWorkoutLogs}
              onSetHealthLogs={setHealthLogs}
            />
          )
        )}
      </div>
    </main>
  )
}
