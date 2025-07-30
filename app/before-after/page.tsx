'use client'

import { useState, useEffect } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import TrainerHeader from '@/components/layout/TrainerHeader'
import Header from '@/components/layout/Header'
import BeforeAfterPhotos from '@/components/before-after/BeforeAfterPhotos'
import type { Member } from '@/components/members/types'
import { getSupabaseClient } from '@/lib/supabase'

export default function HomePage() {
  useAuthGuard()
  const supabase = getSupabaseClient()

  const [members, setMembers] = useState<Member[]>([])
  const [userRole, setUserRole] = useState<'member' | 'trainer' | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
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
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active')
    if (!error && data) setMembers(data)
  }

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
        
        {selectedMember && (
          <BeforeAfterPhotos memberId={String(selectedMember.member_id)} />
        )}


      </main>
    </div>
  )
}
