'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Member, NewWorkoutRecord } from './types'
import AddMemberOpen from './AddMemberOpen'
import { SupabaseClient } from '@supabase/supabase-js'

export default function MemberSearch({
  onSelectMember,
  onSetLogs,
}: {
  onSelectMember: (member: Member) => void
  onSetLogs: (logs: NewWorkoutRecord[]) => void
}) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [keyword, setKeyword] = useState('')
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)

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
    fetchMembers()
  }, [fetchMembers])

  const handleSearch = async () => {
    if (!supabase) return
    const { data: membersData } = await supabase
      .from('members')
      .select('*')
      .ilike('name', `%${keyword}%`)
    setFilteredMembers(membersData || [])
  }

  const handleSelect = async (member: Member) => {
    if (!supabase) return
    const { data: logsData } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('member_id', member.member_id)
    onSetLogs(logsData || [])
    onSelectMember(member)
  }

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
        {filteredMembers.map((member) => (
          <li
            key={member.member_id}
            onClick={() => handleSelect(member)}
            className="bg-white border border-indigo-200 rounded-xl px-5 py-3 shadow-sm hover:shadow-md hover:bg-indigo-50 transition duration-300 cursor-pointer"
          >
            <span className="text-indigo-700 font-semibold">{member.name}</span>
            <span className="text-gray-500 text-sm ml-2">({member.age}세)</span>
          </li>
        ))}
      </ul>

      {isAddMemberOpen && (
        <AddMemberOpen
          onClose={() => setIsAddMemberOpen(false)}
          onMemberAdded={() => fetchMembers()}
        />
      )}
    </div>
  )
}
