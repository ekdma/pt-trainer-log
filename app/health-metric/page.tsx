'use client'

import { useState, useEffect } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import Header from '@/components/layout/Header'
import TrainerHeader from '@/components/layout/TrainerHeader'
import MemberHealthGraphs from '@/components/health-metric/MemberHealthGraphs'
import HealthMetricManager from '@/components/health-metric/HealthMetricManager'
import type { Member, HealthMetric } from '@/components/members/types'
import { fetchHealthLogs } from '@/utils/fetchLogs'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export default function MembersHealthPage() {
  useAuthGuard()
  const supabase = getSupabaseClient()

  const [userRole, setUserRole] = useState<'member' | 'trainer' | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const [healthLogs, setHealthLogs] = useState<HealthMetric[]>([])
  const [activeTab, setActiveTab] = useState<'records' | 'graphs'>('records')

  useEffect(() => {
    const raw = localStorage.getItem('litpt_member')
    const user = raw ? JSON.parse(raw) : null
    if (user) {
      setUserRole(user.role)
      if (user.role === 'member') {
        setSelectedMember(user)
      } else {
        fetchAllMembers()
      }
    }
  }, [])

  const fetchAllMembers = async () => {
    const { data, error } = await supabase.from('members').select('*')
    if (!error && data) setMembers(data)
  }

  useEffect(() => {
    const fetchLogs = async () => {
      if (!selectedMember) return
      const logs = await fetchHealthLogs(selectedMember.member_id)
      setHealthLogs(logs)
    }
    if (activeTab === 'graphs') fetchLogs()
  }, [activeTab, selectedMember])

  return (
    <div className="min-h-screen bg-gray-50">
      {userRole === 'trainer' ? <TrainerHeader /> : <Header />}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {userRole === 'trainer' && (
          <div className="mb-6">
            <select
              value={selectedMember?.member_id || ''}
              onChange={(e) => {
                const selectedId = e.target.value
                const m = members.find(m => String(m.member_id) === selectedId)
                setSelectedMember(m || null)
              }}
              className="block w-full max-w-md px-4 py-2 text-base border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition duration-200 hover:border-rose-400 cursor-pointer"
            >
              <option value="">회원 선택</option>
              {members
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                .map((m) => (
                  <option key={m.member_id} value={m.member_id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {selectedMember ? (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-6">건강기록 관리</h2>

            <div className="flex gap-3 mb-6">
              <Button
                variant={activeTab === 'records' ? 'menu_click' : 'menu_unclick'}
                size="sm"
                onClick={() => setActiveTab('records')}
              >
                기록지
              </Button>

              <Button
                variant={activeTab === 'graphs' ? 'menu_click' : 'menu_unclick'}
                size="sm"
                onClick={() => setActiveTab('graphs')}
              >
                그래프
              </Button>
            </div>

            {activeTab === 'graphs' && (
              <MemberHealthGraphs
                member={selectedMember}
                healthLogs={healthLogs}  // ✅ 수정: logs → healthLogs
                onBack={() => setActiveTab('records')} // ✅ onBack prop도 필요
              />
            )}

            {activeTab === 'records' && (
              <HealthMetricManager
                member={selectedMember}
                logs={healthLogs}
                onUpdateLogs={setHealthLogs}
              />
            )}
          </>
        ) : (
          <div className="text-gray-600">회원을 선택하세요.</div>
        )}
      </main>
    </div>
  )
}

