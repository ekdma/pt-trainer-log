'use client'

import { useState, useEffect } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import TrainerHeader from '@/components/layout/TrainerHeader'
import Header from '@/components/layout/Header'
import BeforeAfterPhotos from '@/components/before-after/BeforeAfterPhotos'
import type { Member } from '@/components/members/types'
import { getSupabaseClient } from '@/lib/supabase'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import { motion } from 'framer-motion'
import MemberSelectListbox from '@/components/ui/MemberSelectListbox'  

export default function HomePage() {
  useAuthGuard()
  const supabase = getSupabaseClient()

  const [members, setMembers] = useState<Member[]>([])
  const [userRole, setUserRole] = useState<'member' | 'trainer' | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
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
            </div>
          </div>
        )}
        
        {/* {selectedMember && (
          <BeforeAfterPhotos memberId={String(selectedMember.member_id)} />
        )} */}
        {selectedMember ? (
          <motion.div
            key={selectedMember?.member_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <BeforeAfterPhotos memberId={String(selectedMember.member_id)} />
          </motion.div>
        ) : (
          <div className="text-gray-600">회원을 선택하세요.</div>
        )}

      </main>
    </div>
  )
}
