'use client'

import { useState, useEffect } from 'react'
import TrainerHeader from '@/components/layout/TrainerHeader'
import MemberSearch from '../../components/members/MemberSearch'
import type { Member, WorkoutRecord, HealthMetric } from '@/components/members/types'
import { fetchWorkoutLogs, fetchHealthLogs } from '../../utils/fetchLogs'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { getSupabaseClient } from '@/lib/supabase'
import { Search, UserRoundPlus, UserRoundSearch } from 'lucide-react';
import { Button } from '@/components/ui/button'
import AddMemberOpen from '@/components/members/AddMemberOpen'
import EditMemberModal from '@/components/members/EditMemberModal'

export default function MembersPage() {
  // const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [keyword, setKeyword] = useState('')
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const supabase = getSupabaseClient()

  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  // const [workoutLogs, setWorkoutLogs] = useState<WorkoutRecord[]>([])
  // const [healthLogs, setHealthLogs] = useState<HealthMetric[]>([])
  const [activeTab, setActiveTab] = useState<'workout' | 'health' | 'food'>('workout')
  // const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([]);

  useAuthGuard()
  
  useEffect(() => {
    const fetchLogs = async () => {
      if (!selectedMember) return
  
      if (activeTab === 'workout') {
        const logs = await fetchWorkoutLogs(selectedMember.member_id)
        // setWorkoutLogs(logs)
      } else if (activeTab === 'health') {
        const logs = await fetchHealthLogs(selectedMember.member_id)
        // setHealthLogs(logs)
      }
    }
  
    fetchLogs()
  }, [activeTab, selectedMember])

  const fetchMembers = async () => {
    const { data, error } = await supabase.from('members').select('*')
    if (!error) setFilteredMembers(data ?? [])
    else console.error('패키지 불러오기 실패:', error.message)
  }

  const handleSearch = async () => {
    // if (!supabase) return;
  
    const trimmedKeyword = keyword.trim();
    
    if (!trimmedKeyword) {
      fetchMembers();
      return;
    }
  
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .ilike('name', `%${trimmedKeyword}%`);
  
    if (error) {
      console.error('검색 에러:', error.message);
    } else {
      setFilteredMembers(data);
    }
  };

  useEffect(() => {
    fetchMembers()
  }, []) 

  return (
    <div className="min-h-screen bg-gray-50">
      <TrainerHeader />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 w-full">
          {/* 좌측: 제목 */}
          <h2 className="text-lg font-semibold text-gray-800">회원 관리</h2>

          {/* 우측: 검색창 + 버튼들 */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* 검색창 */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
                placeholder="이름을 입력하세요"
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 text-black placeholder-gray-400"
              />
              <span className="absolute left-3 top-2.5 text-gray-400"><Search size={18} /></span>
            </div>

            {/* 버튼들 */}
            <Button
              onClick={handleSearch}
              variant="click"
              className="text-sm"
            >
              <UserRoundSearch size={20} /> 검색
            </Button>

            <Button
              onClick={() => setIsAddMemberOpen(true)}
              variant="click"
              className="text-sm"
            >
              <UserRoundPlus size={20} /> 회원 추가
            </Button>
          </div>
        </div>
        <MemberSearch
          members={filteredMembers} // ✅ 전달
          onSelectMember={(member) => {
            setSelectedMember(member)
            setActiveTab('workout')
          }}
          // onSetLogs={setWorkoutLogs}
          // onSetHealthLogs={setHealthLogs}
          setEditingMember={setEditingMember}
        />
      </main>

      {editingMember && (
        <EditMemberModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onUpdate={fetchMembers}
          supabase={supabase}
        />
      )}

      {isAddMemberOpen && (
        <AddMemberOpen
          // open={isAddMemberOpen}
          onClose={() => setIsAddMemberOpen(false)}
          onMemberAdded={() => fetchMembers()}
        />
      )}
          
    </div>
  )
}
