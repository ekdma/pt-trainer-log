'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Member, WorkoutRecord, HealthMetric } from './types'
import AddMemberOpen from './AddMemberOpen'
import { SupabaseClient } from '@supabase/supabase-js'
import EditMemberModal from './EditMemberModal'

export default function MemberSearch({
  onSelectMember,
  onSetLogs,
  onSetHealthLogs,
}: {
  onSelectMember: (member: Member) => void
  onSetLogs: (logs: WorkoutRecord[]) => void
  onSetHealthLogs: (logs: HealthMetric[]) => void
}) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [keyword, setKeyword] = useState('')
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)

  useEffect(() => {
    setSupabase(getSupabaseClient())
  }, [])

  const fetchMembers = async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('members').select('*')
    if (!error && data) {
      setFilteredMembers(data)
    }
  }

  useEffect(() => {
    if (supabase) {
      fetchMembers()
    }
  }, [supabase])
  
  const handleSearch = async () => {
    if (!supabase) return
    if (!keyword.trim()) {
      fetchMembers()
      return
    }
  
    const { data: membersData, error } = await supabase
      .from('members')
      .select('*')
      .ilike('name', `%${keyword}%`)
  
    if (error) {
      console.error('검색 에러:', error.message)
    } else {
      setFilteredMembers(membersData || [])
    }
  }

  const handleSelect = async (member: Member) => {
    if (!supabase) return

    // 운동 기록 가져오기
    const { data: logsData } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('member_id', member.member_id)

    onSetLogs(logsData || [])

    // 건강 지표 기록 가져오기
    const { data: healthData } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('member_id', member.member_id)

    onSetHealthLogs(healthData || [])

    // 회원 선택 콜백 호출
    onSelectMember(member)
  }

  const handleDelete = async (memberId: number) => {
    if (!supabase) return
    const confirmDelete = confirm('정말로 이 회원을 삭제하시겠습니까?')
    if (!confirmDelete) return

    const { error } = await supabase.from('members').delete().eq('member_id', memberId)
    if (error) {
      alert('회원 삭제 중 문제가 발생했어요 😥')
      return
    }
    alert('회원 삭제를 완료하였습니다 😊')
    fetchMembers()
  }

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return '?'
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }
  
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    // 1. 역할 우선순위: TRAINER 먼저
    if (a.role !== b.role) {
      return a.role === 'TRAINER' ? -1 : 1
    }
  
    // 2. 이름 가나다/알파벳 순 정렬 (localeCompare 사용)
    return a.name.localeCompare(b.name, 'ko')
  })

  return (
    <div className="flex flex-col items-center justify-center text-center bg-slate-50 py-8 px-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold text-indigo-600">회원 관리</h1>
        <p className="text-sm text-gray-500 mt-2">운동 기록을 확인하거나 새로운 회원을 등록해보세요</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center mb-6 space-y-2 sm:space-y-0 sm:space-x-3 w-full max-w-md">
        <div className="relative w-full sm:w-auto">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch()
            }}
            placeholder="이름을 입력하세요"
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder-gray-400"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>

        <button
          onClick={handleSearch}
          className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-full shadow-md transition"
        >
          검색
        </button>

        <button
          onClick={() => setIsAddMemberOpen(true)}
          className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full shadow-md transition"
        >
          신규회원 등록
        </button>
      </div>

      <ul className="space-y-3 w-full max-w-md">
        {sortedMembers.map((member) => {
          const formattedJoinDate = new Date(member.join_date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
          return (
            <li
              key={member.member_id}
              className="bg-white border border-indigo-200 rounded-xl px-5 py-3 shadow-sm hover:shadow-md transition duration-300 flex justify-between items-center"
            >
              {/* 왼쪽 정보 클릭 영역 */}
              <div
                onClick={() => handleSelect(member)}
                className="flex items-center gap-4 cursor-pointer hover:bg-indigo-50 rounded-md px-3 py-2 transition flex-1"
              >
                {/* 역할 뱃지 */}
                <span
                  className={`text-xs font-bold text-white rounded-full px-2 py-0.5 ${
                    member.role === 'TRAINER' ? 'bg-orange-500' : 'bg-indigo-500'
                  }`}
                >
                  {member.role}
                </span>

                {/* 이름 + 정보 */}
                <div className="flex flex-col">
                  <span className="text-indigo-800 font-semibold text-lg leading-tight">
                    {member.name}
                  </span>
                  <div className="flex gap-2 text-indigo-900 text-sm mt-1 flex-wrap">
                    <span className="flex items-center gap-1 bg-gray-100 text-gray-900 px-2 py-1 rounded-full shadow-sm">
                      {member.sex}
                    </span>
                    <span className="flex items-center gap-1 bg-gray-100 text-gray-900 px-2 py-1 rounded-full shadow-sm">
                      {calculateAge(member.birth_date)}세
                    </span>
                    <span className="flex items-center gap-1 bg-gray-100 text-gray-900 px-2 py-1 rounded-full shadow-sm">
                      📅 {formattedJoinDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* 오른쪽 버튼 영역 */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => setEditingMember(member)}
                  className="text-blue-500 text-xs hover:text-blue-700 transition"
                  title="회원 정보 수정"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(member.member_id)}
                  className="text-red-500 text-xs hover:text-red-700 transition"
                  title="회원 삭제"
                >
                  ❌
                </button>
              </div>
            </li>

          )
        })}
      </ul>
      {editingMember && supabase && (
        <EditMemberModal
          member={editingMember}
          supabase={supabase}
          onClose={() => setEditingMember(null)}
          onUpdate={fetchMembers}
        />
      )}
      {isAddMemberOpen && (
        <AddMemberOpen
          onClose={() => setIsAddMemberOpen(false)}
          onMemberAdded={() => fetchMembers()}
        />
      )}
    </div>
  )
}
