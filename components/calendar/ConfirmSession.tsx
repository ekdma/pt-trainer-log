'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import dayjs from 'dayjs'
import { XMarkIcon } from '@heroicons/react/24/solid'

interface Session {
  calendar_sessions_id: string
  workout_date: string
  workout_time: string
  session_type: string
  status: string
  updated_at: string
  member_id: string
  member: {
    name: string
  } | null
}

interface MemberPackage {
  member_id: number
  start_date: string
  end_date: string
  pt_session_cnt: number | null
  group_session_cnt: number | null
  self_session_cnt: number | null
}

interface ConfirmSessionProps {
  trainerId: string
  onClose: () => void
  onSessionChange?: () => void
}

export default function ConfirmSession({ trainerId, onClose, onSessionChange }: ConfirmSessionProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [memberPackages, setMemberPackages] = useState<MemberPackage[]>([])
  const [usedSessionsCount, setUsedSessionsCount] = useState<Record<string, number>>({}) // ex: {'123_PT': 4}
  const supabase = getSupabaseClient()

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('calendar_sessions')
      .select(`
        calendar_sessions_id,
        member_id,
        workout_date,
        workout_time,
        session_type,
        status,
        updated_at,
        member:members!calendar_sessions_member_id_fkey (
          name,
          phone
        )
      `)
      .eq('status', '신청')
      .order('workout_date', { ascending: false })
      .order('workout_time', { ascending: false })

    if (!error && data) {
      setSessions(data as unknown as Session[])
    }
  }

  const fetchMemberPackages = async () => {
    const { data, error } = await supabase
      .from('member_packages')
      .select('member_id, start_date, end_date, pt_session_cnt, group_session_cnt, self_session_cnt')
      .eq('trainer_id', trainerId)
      .eq('status', 'active')

    if (!error && data) {
      setMemberPackages(data as MemberPackage[])
    }
  }

  const fetchUsedSessionsCount = async () => {
    // 3-1) 해당 트레이너 확정 세션 모두 가져오기
    const { data: confirmedSessions, error } = await supabase
      .from('calendar_sessions')
      .select('member_id, session_type, workout_date, status')
      .eq('trainer_id', trainerId)
      .eq('status', '확정')

    if (error || !confirmedSessions) {
      console.error('확정 세션 불러오기 실패:', error)
      return
    }

    // 3-2) 각 member_id + session_type 별로 패키지 기간 내 확정 세션 수 세기
    const usage: Record<string, number> = {}

    for (const pkg of memberPackages) {
      const { member_id, start_date, end_date } = pkg

      for (const type of ['PT', 'GROUP', 'SELF']) {
        // 패키지에서 해당 타입 세션 개수 존재하면만 체크
        const totalSessionsCount = 
          type === 'PT' ? pkg.pt_session_cnt :
          type === 'GROUP' ? pkg.group_session_cnt :
          type === 'SELF' ? pkg.self_session_cnt : 0

        if (!totalSessionsCount || totalSessionsCount === 0) continue

        // 확정 세션 중 해당 member, session_type, 패키지 기간 내 세션만 필터링
        const count = confirmedSessions.filter(
          (s) =>
            s.member_id === member_id &&
            s.session_type === type &&
            s.workout_date >= start_date &&
            s.workout_date <= end_date
        ).length

        usage[`${member_id}_${type}`] = count
      }
    }
    setUsedSessionsCount(usage)
  }

  const updateStatus = async (id: string, status: '확정' | '취소') => {
    const { error, data } = await supabase
      .from('calendar_sessions')
      .update({ status })
      .eq('calendar_sessions_id', id)
      .select(`
        calendar_sessions_id,
        member_id,
        workout_date,
        workout_time,
        session_type,
        status,
        updated_at,
        member:members!calendar_sessions_member_id_fkey (
          name,
          phone
        )
      `)

    if (!error && data && data.length > 0) {
      const session = data[0]
  
      // member는 배열이므로 첫 번째 요소를 가져오기
      const memberInfo = Array.isArray(session.member) ? session.member[0] : session.member
  
      const memberName = memberInfo?.name || ''
      const memberPhone = memberInfo?.phone
  
      if (memberPhone) {
        const dateStr = dayjs(session.workout_date).format('YYYY-MM-DD')
        const timeStr = session.workout_time
        const sessionType = session.session_type
  
        try {
          await fetch('/api/sendKakao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: memberPhone.startsWith('82')
                ? memberPhone
                : `82${memberPhone.replace(/^0/, '')}`,
              name: memberName,
              date: dateStr,
              time: timeStr,
              status,
              sessionType,
              templateCode: status === '확정' ? 'RESERVE_CONFIRM' : 'RESERVE_CANCEL',
            }),
          })
        } catch (err) {
          console.error('카카오톡 발송 실패:', err)
        }
      }
  
      fetchSessions()
      onSessionChange?.()
    }
  }

  useEffect(() => {
    fetchSessions()
    fetchMemberPackages()
  }, [trainerId])

  useEffect(() => {
    if (memberPackages.length > 0) {
      fetchUsedSessionsCount()
    }
  }, [memberPackages])

  function renderSessionUsage(memberId: number | null) {
    if (!memberId) return null
  
    const pkg = memberPackages.find(p => p.member_id === memberId)
    if (!pkg) return null
  
    const sessionTypes = ['PT', 'GROUP', 'SELF'] as const
  
    return sessionTypes.map(type => {
      const totalCount = 
        type === 'PT' ? (pkg.pt_session_cnt ?? 0) :
        type === 'GROUP' ? (pkg.group_session_cnt ?? 0) :
        type === 'SELF' ? (pkg.self_session_cnt ?? 0) : 0
      
      if (totalCount === 0) return null
  
      const usedCount = usedSessionsCount[`${memberId}_${type}`] ?? 0
  
      return (
        <span key={type} className="ml-2 text-xs text-gray-500">
          {type}: {usedCount}/{totalCount}
        </span>
      )
    })
  }
  

  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 shadow-lg relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800">
          <XMarkIcon className="h-6 w-6" />
        </button>

        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">회원 신청 내역</h3>

        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">신청된 수업이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {sessions.map((session: Session) => {
              const id = session.member_id ?? session.member_id ?? null
              // memberId가 없으면 그냥 출력
              if (!id) return (
                <li key={session.calendar_sessions_id} className="px-2 py-3 text-sm text-gray-800 space-y-1">
                  <div className="flex flex-wrap justify-between items-center">
                    <div className="flex gap-4 flex-wrap">
                      <span className="font-medium w-[30px]">{dayjs(session.workout_date).format('MM/DD')}</span>
                      <span className="w-[30px]">{session.workout_time.slice(0, 5)}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          session.session_type === 'PT'
                            ? 'bg-indigo-100 text-indigo-700'
                            : session.session_type === 'SELF'
                            ? 'bg-green-100 text-green-700'
                            : session.session_type === 'GROUP'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700' // 기본값
                        }`}
                      >
                        {session.session_type.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-gray-500 mt-0.5">신청시각: {dayjs(session.updated_at).format('YYYY-MM-DD HH:mm')}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900 truncate">{session.member?.name || '이름없음'}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(session.calendar_sessions_id, '확정')}
                        className="text-green-700 border border-green-600 px-2 py-1 rounded text-xs hover:bg-green-100"
                      >
                        확정
                      </button>
                      <button
                        onClick={() => updateStatus(session.calendar_sessions_id, '취소')}
                        className="text-red-700 border border-red-600 px-2 py-1 rounded text-xs hover:bg-red-100"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                </li>
              )

              // // 사용 횟수 가져오기
              // const usedKey = `${id}_${session.session_type}`

              // // total 횟수 가져오기
              // const pkg = memberPackages.find(
              //   (p) => p.member_id === id
              // )
              // let totalCount = 0
              // if (pkg) {
              //   totalCount = 
              //     session.session_type === 'PT' ? (pkg.pt_session_cnt ?? 0) :
              //     session.session_type === 'GROUP' ? (pkg.group_session_cnt ?? 0) :
              //     session.session_type === 'SELF' ? (pkg.self_session_cnt ?? 0) : 0
              // }

              return (
                <li key={session.calendar_sessions_id} className="px-2 py-3 text-sm text-gray-800 space-y-1">
                  <div className="flex flex-wrap justify-between items-center">
                    <div className="flex gap-4 flex-wrap">
                      <span className="font-medium w-[30px]">{dayjs(session.workout_date).format('MM/DD')}</span>
                      <span className="w-[30px]">{session.workout_time.slice(0, 5)}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          session.session_type === 'PT'
                            ? 'bg-indigo-100 text-indigo-700'
                            : session.session_type === 'SELF'
                            ? 'bg-green-100 text-green-700'
                            : session.session_type === 'GROUP'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700' // 기본값
                        }`}
                      >
                        {session.session_type.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-gray-500 mt-0.5">신청시각: {dayjs(session.updated_at).format('YYYY-MM-DD HH:mm')}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900 truncate">
                      {session.member?.name || '이름없음'}
                      
                      {/* {totalCount > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({usedCount}/{totalCount})
                        </span>
                      )} */}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(session.calendar_sessions_id, '확정')}
                        className="text-green-700 border border-green-600 px-2 py-1 rounded text-xs hover:bg-green-100"
                      >
                        확정
                      </button>
                      <button
                        onClick={() => updateStatus(session.calendar_sessions_id, '취소')}
                        className="text-red-700 border border-red-600 px-2 py-1 rounded text-xs hover:bg-red-100"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                  <div>
                    {renderSessionUsage(Number(id))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
