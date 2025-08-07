'use client'

import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
dayjs.extend(isBetween)
import { useState, useEffect, useMemo } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
// import { Member, WorkoutRecord, HealthMetric } from './types'
import { MemberCounsel } from '@/components/members/types'
import { SupabaseClient } from '@supabase/supabase-js'
import 'react-calendar/dist/Calendar.css'
import {  Calendar as CalendarIcon } from 'lucide-react';
// import { Button } from '@/components/ui/button'
// import { useRouter } from 'next/navigation'  

function formatPhoneDisplay(phone: string | null | undefined) {
  if (!phone) return '-'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return digits
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

export default function MemberSearch({
  // setEditingMember,
  members,
}: {
  onSelectMember: (member: MemberCounsel) => void
  // setEditingMember: (member: MemberCounsel) => void
  members: MemberCounsel[] 
}) {
  // const router = useRouter()  
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    setSupabase(getSupabaseClient())
  }, [])

  const [internalMembers, setInternalMembers] = useState<MemberCounsel[]>(members);

  useEffect(() => {
    setInternalMembers(members); // 외부 props가 바뀔 때 반영
  }, [members]);
  

  const fetchMembers = async () => {
    if (!supabase) return
    // const { data, error } = await supabase.from('members').select('*')
    const { data, error } = await supabase
      .from('members_counsel')
      .select('*')
      // .eq('status', 'active');

      if (!error && data) {
      setInternalMembers(data);
    }
  }

  useEffect(() => {
    if (supabase) {
      fetchMembers()
    }
  }, [supabase])
  
  // const handleDelete = async (memberId: number) => {
  //   if (!supabase) return;
  
  //   const password = prompt('비밀번호를 입력하세요 🤐');
  //   if (password !== '2213') {
  //     alert('비밀번호가 일치하지 않습니다 ❌');
  //     return;
  //   }
  
  //   const confirmDelete = confirm('정말로 이 회원을 삭제하시겠습니까?');
  //   if (!confirmDelete) return;
  
  //   // const { error } = await supabase.from('members').delete().eq('member_id', memberId);
  //   const { error } = await supabase
  //     .from('members')
  //     .update({ status: 'delete' })
  //     .eq('member_id', memberId);

  //   if (error) {
  //     alert('회원 삭제 중 문제가 발생했어요 😥');
  //     return;
  //   }
  
  //   alert('회원 삭제를 완료하였습니다 😊');
  //   fetchMembers();
  // };


  const filteredMembers = useMemo(() => internalMembers, [internalMembers]);
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    // // 1. 역할 우선순위: TRAINER 먼저
    // if (a.role !== b.role) {
    //   return a.role === 'TRAINER' ? -1 : 1
    // }
  
    // 2. 이름 가나다/알파벳 순 정렬 (localeCompare 사용)
    return a.name.localeCompare(b.name, 'ko')
  })

  return (
    <div className="flex flex-col items-center justify-center text-center bg-slate-50 py-8 px-4">
      <ul className="space-y-4 w-full max-w-3xl mx-auto">
        {sortedMembers.map((member) => {
          const formattedJoinDate = dayjs(member.creation_dt).format('YY.MM.DD');
          return (
            <li
              key={member.member_counsel_id}
              className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm hover:shadow-md transition duration-300 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              {/* 왼쪽 정보 클릭 영역 */}
              <div
                // onClick={() => handleSelect(member)}
                className="flex cursor-pointer hover:bg-indigo-50 rounded-md px-3 py-2 transition flex-1 items-center gap-6"
              >
                {/* 이름 + 정보 */}
                <div className="flex flex-col items-center flex-grow">
                  <span className="text-gray-800 font-semibold text-lg leading-tight">
                    {member.name}
                  </span>

                  {/* 첫 번째 줄: 성별 + 가입일 */}
                  <div className="flex gap-2 text-indigo-900 text-sm mt-1 flex-wrap items-center justify-center">
                    <span className="flex items-center gap-1 bg-gray-100 text-gray-900 px-2 py-1 rounded-full shadow-sm">
                      {member.gender}
                    </span>
                    <span className="flex items-center gap-1 bg-gray-100 text-gray-900 px-2 py-1 rounded-full shadow-sm">
                      <CalendarIcon size={13} />
                      {formattedJoinDate}
                    </span>
                    <span className="flex items-center gap-1 bg-gray-100 text-gray-900 px-2 py-1 rounded-full shadow-sm">
                      {formatPhoneDisplay(member.phone)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 오른쪽 버튼 영역 */}
              {/* <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setEditingMember(member)}
                  variant="ghost"
                  className="font-semibold bg-white border border-transparent text-indigo-700 hover:bg-indigo-300 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
                  title="회원 수정"
                >
                  <UserRoundPen size={16} />
                  수정
                </Button>
                <Button
                  onClick={() => handleDelete(member.member_counsel_id)}
                  variant="ghost"
                  className="font-semibold bg-white border border-transparent text-red-600 hover:bg-red-100 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
                  title="회원 삭제"
                >
                  <UserRoundMinus size={16} />
                  삭제
                </Button>
              </div> */}
            </li>

          )
        })}
      </ul>
    </div>
  )
}
