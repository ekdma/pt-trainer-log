'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Member, NewWorkoutRecord } from './types'

export default function MemberSearch({
  onSelectMember,
  onSetLogs,
}: {
  onSelectMember: (member: Member) => void
  onSetLogs: (logs: NewWorkoutRecord[]) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase.from('members').select('*')
      if (!error && data) {
        setFilteredMembers(data)
      }
    }
    fetchMembers()
  }, [])

  const handleSearch = async () => {
    const { data: membersData } = await supabase
      .from('members')
      .select('*')
      .ilike('name', `%${keyword}%`)
    setFilteredMembers(membersData || [])
  }

  const handleSelect = async (member: Member) => {
    const { data: logsData } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('member_id', member.member_id)
    onSetLogs(logsData || [])
    onSelectMember(member)
  }

  return (
    <div className="flex flex-col items-center justify-center text-center min-h-screen bg-slate-50">
      <h1 className="text-2xl font-bold text-indigo-300 mb-6">회원 검색</h1>
      <div className="flex items-center justify-center mb-4">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch(); 
          }}
          placeholder="이름을 입력하세요"
          className="border p-2 rounded mr-2 w-64 text-black placeholder-gray-400"
        />
        <button
          onClick={handleSearch}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
        >
          검색
        </button>
      </div>
      <ul className="space-y-2">
        {filteredMembers.map((member) => (
          <li
            key={member.member_id}
            className="bg-transparent text-indigo-600 border border-indigo-600 px-5 py-2 rounded-xl hover:bg-indigo-100 transition duration-300"
            onClick={() => handleSelect(member)}
          >
            {member.name} ({member.age}세)
          </li>
        ))}
      </ul>
    </div>
  )
}
