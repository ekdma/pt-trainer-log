'use client'

import { useState, useEffect } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import Header from '@/components/layout/Header'
import TrainerHeader from '@/components/layout/TrainerHeader'
import MemberHealthGraphs from '@/components/health-metric/MemberHealthGraphs'
import HealthMetricManager from '@/components/health-metric/HealthMetricManager'
import type { Member, HealthMetric, HealthMetricType } from '@/components/members/types'
import { fetchHealthLogs } from '@/utils/fetchLogs'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import OrderHealthMetricModal from '@/components/health-metric/OrderHealthMetricModal' 
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import { motion } from 'framer-motion'
import MemberSelectListbox from '@/components/ui/MemberSelectListbox'  

export default function MembersHealthPage() {
  useAuthGuard()
  const supabase = getSupabaseClient()
  
  const [userRole, setUserRole] = useState<'member' | 'trainer' | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  
  const [healthLogs, setHealthLogs] = useState<HealthMetric[]>([])
  const [activeTab, setActiveTab] = useState<'records' | 'graphs'>('records')
  const [showGlobalOrderModal, setShowGlobalOrderModal] = useState(false);
  const [allTypes, setAllTypes] = useState<HealthMetricType[]>([])
  const [memberTab, setMemberTab] = useState<'all' | 'active'>('active')

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
    const query = supabase.from('members').select('*')

    // memberTab 상태에 따라 쿼리 조건 분기
    if (memberTab === 'active') {
      query.eq('status', 'active')
    } else {
      query.neq('status', 'delete')
    }

    const { data } = await query
    setMembers(data || [])
  }

  useEffect(() => {
    fetchAllMembers()
  }, [memberTab])

  useEffect(() => {
    const fetchLogs = async () => {
      if (!selectedMember) return
      const logs = await fetchHealthLogs(selectedMember.member_id)
      setHealthLogs(logs)
    }
    if (activeTab === 'graphs') fetchLogs()
  }, [activeTab, selectedMember])

  const fetchAllTypes = async () => {
    const { data, error } = await supabase
      .from('health_metric_types')
      .select('*')
  
    if (!error && data) {
      setAllTypes(data)
    }
  }

  useEffect(() => {
    if (selectedMember) {
      fetchAllTypes()
    }
  }, [selectedMember])
  
  
  return (
    <div className="min-h-screen bg-gray-50">
      {userRole === 'trainer' ? <TrainerHeader /> : <Header />}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {userRole === 'trainer' && (
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <ToggleGroup
                type="single"
                value={memberTab}
                onValueChange={(value) => {
                  if (value) setMemberTab(value as 'all' | 'active')
                }}
              >
                <ToggleGroupItem value="all" className="text-sm px-4 py-2">
                  <span className="hidden sm:inline">전체회원</span>
                  <span className="inline sm:hidden">전체</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="active" className="text-sm px-4 py-2">
                  <span className="hidden sm:inline">현재회원</span>
                  <span className="inline sm:hidden">현재</span>
                </ToggleGroupItem>
              </ToggleGroup>
              <MemberSelectListbox
                members={members}
                value={selectedMember}
                onChange={setSelectedMember}
                getKey={(m) => m.member_id}
                getName={(m) => m.name}
              />
              {/* <select
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
              </select> */}
            </div>
          </div>
        )}

        {selectedMember ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-lg font-semibold text-gray-800">건강기록 관리</h2>
              {userRole === 'trainer' && (
                <button
                  onClick={() => setShowGlobalOrderModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition bg-gray-200 text-gray-800 hover:bg-gray-300"
                >
                  순서
                </button>
              )}

              <OrderHealthMetricModal
                isOpen={showGlobalOrderModal}
                onClose={() => setShowGlobalOrderModal(false)}
                allTypes={allTypes}
                onRefreshAllTypes={fetchAllTypes}
              />
            </div>

            <div className="flex gap-3 mb-6">
              <Button
                variant={activeTab === 'records' ? 'menu_click' : 'menu_unclick'}
                size="sm"
                onClick={() => setActiveTab('records')}
                className='text-xs sm:text-sm'
              >
                기록지
              </Button>

              <Button
                variant={activeTab === 'graphs' ? 'menu_click' : 'menu_unclick'}
                size="sm"
                onClick={() => setActiveTab('graphs')}
                className='text-xs sm:text-sm'
              >
                그래프
              </Button>
            </div>
                
            <motion.div
              key={selectedMember?.member_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            > 
              {activeTab === 'graphs' && (
                <MemberHealthGraphs
                  member={selectedMember}
                  healthLogs={healthLogs}  // ✅ 수정: logs → healthLogs
                  allTypes={allTypes}   
                  onBack={() => setActiveTab('records')} // ✅ onBack prop도 필요
                />
              )}

              {activeTab === 'records' && (
                <HealthMetricManager
                  member={selectedMember}
                  logs={healthLogs}
                  allTypes={allTypes}   
                  onUpdateLogs={setHealthLogs}
                  onRefreshAllTypes={fetchAllTypes}
                />
              )}
            </motion.div>
          </>
        ) : (
          <div className="text-gray-600">회원을 선택하세요.</div>
        )}
      </main>
    </div>
  )
}

