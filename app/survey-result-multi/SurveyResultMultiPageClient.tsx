'use client'

import { useEffect, useState } from 'react'
// import TrainerHeader from '@/components/layout/TrainerHeader'
import SurveyResultMulti from '@/components/survey-response/SurveyResultMulti'
import { getSupabaseClient } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import MemberSelectListbox from '@/components/ui/MemberSelectListbox'  

interface MemberCounsel {
  member_counsel_id: number
  name: string
}

export default function SurveyResultPage() {
  const supabase = getSupabaseClient()
  const searchParams = useSearchParams()
  const surveyIds = searchParams.getAll('surveyID')
  const memberCounselIdFromUrl = searchParams.get('member_counsel_id')
  const memberCounselId = memberCounselIdFromUrl ? Number(memberCounselIdFromUrl) : null
  const [members, setMembers] = useState<MemberCounsel[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberCounsel | null>(null)

  useAuthGuard()
  // 회원 목록 불러오기
  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('members_counsel')
        .select('member_counsel_id, name')

      if (error) {
        console.error('회원 목록 불러오기 실패:', error)
        return
      }

      setMembers(data || [])

      // URL 쿼리에 member_counsel_id가 있으면 초기 선택
      if (memberCounselIdFromUrl && data) {
        const memberFromUrl = data.find(
          (m) => String(m.member_counsel_id) === memberCounselIdFromUrl
        )
        if (memberFromUrl) {
          setSelectedMember(memberFromUrl)
        }
      }
    }

    fetchMembers()
  }, [memberCounselIdFromUrl]) // 검색 파라미터 바뀌면 다시 체크

  return (
    <>
      {/* <TrainerHeader /> */}
      <div className="w-full max-w-screen-lg mx-auto">
        <main className="max-w-6xl mx-auto px-4 py-8">
          {!memberCounselIdFromUrl ? (
            <div className="mb-6">
              <MemberSelectListbox<MemberCounsel>
                members={members}
                value={selectedMember}
                onChange={setSelectedMember}
                getKey={(m) => m.member_counsel_id}
                getName={(m) => m.name}
              />
              {/* <select
                value={selectedMember?.member_counsel_id || ''}
                onChange={(e) => {
                  const selectedId = e.target.value
                  const m = members.find(
                    (m) => String(m.member_counsel_id) === selectedId
                  )
                  setSelectedMember(m || null)
                }}
                className="
                  block w-full max-w-md px-4 py-2 text-base
                  border border-gray-300 rounded-md bg-white text-gray-700
                  focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent
                  transition duration-200 hover:border-rose-400 cursor-pointer
                "
              >
                <option value="">회원 선택</option>
                {members
                  .slice()
                  .sort((a, b) =>
                    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
                  )
                  .map((m) => (
                    <option key={m.member_counsel_id} value={m.member_counsel_id}>
                      {m.name}
                    </option>
                  ))}
              </select> */}
            </div>
          ) : null}

          {selectedMember && memberCounselId && (
            <SurveyResultMulti
              surveyIds={surveyIds}
              memberCounselId={memberCounselId}
            />
          )}
        </main>
      </div>
    </>
  )
}
