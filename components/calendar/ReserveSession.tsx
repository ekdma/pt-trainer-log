'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import RadioGroup from '@/components/ui/radio-group'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase'
import EditConfirmedSession from '@/components/calendar/EditConfirmedSession'
import {
  Root as Popover,
  Trigger as PopoverTrigger,
  Content as PopoverContent,
} from '@radix-ui/react-popover'
import { TriangleAlert } from "lucide-react"
import dayjs from 'dayjs'
import MemberPackageSelectListbox from '@/components/ui/MemberPackageSelectListbox'

interface CalendarSession {
  calendar_sessions_id: string;
  workout_date: string;
  workout_time: string;
  session_type: string;
  member_id: string;
  status: string;
  updated_at?: string;
  notes: string;
  members: {
    name: string;
  };
}

interface ReserveSessionProps {
  selectedDate: Date
  trainerId: string
  onSessionChange?: () => void
}

export default function ReserveMemberSession({ selectedDate, trainerId, onSessionChange }: ReserveSessionProps) {
  const supabase = getSupabaseClient()

  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [blockedSessions, setBlockedSessions] = useState<CalendarSession[]>([])
  const [selectedHour, setSelectedHour] = useState<string | null>(null)
  const [selectedSessionType, setSelectedSessionType] = useState<string>('PT')
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [memberList, setMemberList] = useState<{ id: number; name: string }[]>([])
  const [selectedPendingSession, setSelectedPendingSession] = useState<CalendarSession | null>(null)
  const [editingSession, setEditingSession] = useState<CalendarSession | null>(null)
  const [selectedConfirmedSession, setSelectedConfirmedSession] = useState<CalendarSession | null>(null)
  const [confirmingCancelSession, setConfirmingCancelSession] = useState<CalendarSession | null>(null)
  const [multiSessionsModalTime, setMultiSessionsModalTime] = useState<string | null>(null)
  const [remainingSessions, setRemainingSessions] = useState<Record<string, { total: number; used: number }>>({})
  const [memberPackageMap, setMemberPackageMap] = useState<Record<string, { start_date: string, end_date: string }>>({})
  const [allConfirmedSessions, setAllConfirmedSessions] = useState<CalendarSession[]>([])

  useEffect(() => {
    setAvailableTimes(Array.from({ length: 12 }, (_, i) => `${9 + i}:00`))
  }, [])

  useEffect(() => {
    setSelectedHour(null)
    setSelectedPendingSession(null)
    setSelectedConfirmedSession(null)
    setEditingSession(null)
  }, [selectedDate])
  

  useEffect(() => {
    const fetchBlocked = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const { data, error } = await supabase
        .from('calendar_sessions')
        .select('calendar_sessions_id, workout_date, workout_time, session_type, member_id, status, notes, members(name)')
        .eq('trainer_id', trainerId)
        .eq('workout_date', dateStr)
  
      if (!error && data) {
        const normalized = data.map((item) => ({
          ...item,
          members: Array.isArray(item.members) ? item.members[0] : item.members
        }))
        setBlockedSessions(normalized as CalendarSession[])
      }
        
      console.log('fetchBlocked data:', data)
    }
    fetchBlocked()
  }, [selectedDate, trainerId])

  useEffect(() => {
    const fetchMembers = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      const { data: packages, error } = await supabase
        .from('member_packages')
        .select('member_id')
        .eq('trainer_id', trainerId)
        .eq('status', 'active')
        .lte('start_date', dateStr)
        .gte('end_date', dateStr)

      if (error || !packages) return setMemberList([])

      const memberIds = packages.map((p) => p.member_id)

      const { data: members } = await supabase
        .from('members')
        .select('member_id, name')
        .in('member_id', memberIds)

      if (members) {
        setMemberList(members.map((m) => ({ id: m.member_id, name: m.name })))
      }
    }

    fetchMembers()
  }, [trainerId, selectedDate])

  useEffect(() => {
    const fetchRemainingSessions = async () => {
  
      // 전체 member_packages 조회 (패키지 범위 포함)
      const { data: packages, error: pkgError } = await supabase
        .from('member_packages')
        .select('member_id, start_date, end_date, pt_session_cnt, group_session_cnt, self_session_cnt')
        .eq('trainer_id', trainerId)
        .eq('status', 'active')
  
      if (pkgError || !packages) {
        console.error('패키지 불러오기 실패:', pkgError)
        return
      }
  
      // 전체 확정 세션 미리 가져오기
      const { data: sessions, error: sessionError } = await supabase
        .from('calendar_sessions')
        .select('member_id, session_type, workout_date')
        .eq('trainer_id', trainerId)
        .eq('status', '확정')
  
      if (sessionError || !sessions) {
        console.error('확정 세션 불러오기 실패:', sessionError)
        return
      }
  
      const usage: Record<string, { total: number; used: number }> = {}
      const packageMap: Record<string, { start_date: string, end_date: string }> = {}
      for (const pkg of packages) {
        const { member_id, start_date, end_date, pt_session_cnt, group_session_cnt, self_session_cnt } = pkg
  
        const sessionTypes = [
          { type: 'PT', total: pt_session_cnt },
          { type: 'GROUP', total: group_session_cnt },
          { type: 'SELF', total: self_session_cnt },
        ]
  
        for (const { type, total } of sessionTypes) {
          if (!total || total === 0) continue
  
          const used = sessions.filter(s =>
            s.member_id === member_id &&
            s.session_type === type &&
            s.workout_date >= start_date &&
            s.workout_date <= end_date
          ).length
  
          usage[`${member_id}_${type}`] = { total, used }

          const key = `${member_id}_${type}`
          packageMap[key] = { start_date, end_date }
        }
        
      }
      setMemberPackageMap(packageMap)
      setRemainingSessions(usage)
    }
  
    fetchRemainingSessions()
  }, [selectedDate, trainerId])
  
  useEffect(() => {
    const fetchData = async () => {
      // 1) 회원 패키지 전체 조회
      const { data: packages, error: pkgError } = await supabase
        .from('member_packages')
        .select('member_id, start_date, end_date, pt_session_cnt, group_session_cnt, self_session_cnt')
        .eq('trainer_id', trainerId)
        .eq('status', 'active')
  
      if (pkgError || !packages) {
        console.error('패키지 불러오기 실패:', pkgError)
        return
      }
  
      // 2) 회원별 패키지 기간 최대 범위 계산 (모든 패키지의 min start_date, max end_date)
      const allStartDates = packages.map(p => new Date(p.start_date))
      const allEndDates = packages.map(p => new Date(p.end_date))
      const minStartDate = new Date(Math.min(...allStartDates.map(d => d.getTime())))
      const maxEndDate = new Date(Math.max(...allEndDates.map(d => d.getTime())))
  
      // 3) 패키지 기간 내 모든 확정 세션 조회 (trainerId, status=확정, workout_date between minStartDate & maxEndDate)
      const { data: sessions, error: sessionError } = await supabase
        .from('calendar_sessions')
        .select('calendar_sessions_id, workout_date, workout_time, session_type, member_id, status, members(name)')
        .eq('trainer_id', trainerId)
        .eq('status', '확정')
        .gte('workout_date', minStartDate.toISOString().slice(0,10))
        .lte('workout_date', maxEndDate.toISOString().slice(0,10))
  
      if (sessionError || !sessions) {
        console.error('확정 세션 불러오기 실패:', sessionError)
        return
      }
  
      // 4) usage 계산 및 packageMap 만들기 (기존과 동일)
      // (생략, 동일하게 처리)
  
      // 5) 상태 업데이트
      const normalized = sessions.map((item) => ({
        ...item,
        members: Array.isArray(item.members) ? item.members[0] : item.members
      }))
  
      setAllConfirmedSessions(normalized as CalendarSession[])
      // setRemainingSessions(usage)
      // setMemberPackageMap(packageMap)
    }
  
    fetchData()
  }, [trainerId])
  
  const handleReserve = async () => {
    if (!selectedHour || !selectedSessionType || !selectedMemberId) {
      toast.error('모든 항목을 선택해주세요.')
      return
    }
  
    const workout_date = format(selectedDate, 'yyyy-MM-dd')
  
    const { data, error } = await supabase
      .from('calendar_sessions')
      .insert({
        workout_date,
        workout_time: selectedHour,
        trainer_id: trainerId,
        member_id: selectedMemberId,
        session_type: selectedSessionType,
        status: '확정',
      })
      .select() // insert 후 반환된 데이터 받기 위해
  
    if (error) {
      toast.error('등록 실패')
      console.error(error)
    } else if (data && data.length > 0) {
      toast.success(`${workout_date} ${selectedHour} 수업이 등록되었습니다!`)
      setSelectedHour(null)
  
      // 새로 추가된 세션 정보를 blockedSessions에 직접 추가 (즉시 UI 반영)
      const newSession = data[0]
      const memberName = memberList.find(m => m.id === newSession.member_id)?.name || ''
  
      // setBlockedSessions(prev => [
      //   ...prev,
      //   {
      //     workout_time: newSession.workout_time,
      //     member_id: newSession.member_id,
      //     status: newSession.status,
      //     members: { name: memberName }
      //   }
      // ])
  
      // // 전체 다시 불러오려면 필요
      // onSessionChange?.()
      const formattedSession = {
        ...newSession,
        members: { name: memberName }
      }
  
      setBlockedSessions((prev) => [...prev, formattedSession])
      setSelectedHour(null)
  
      // ✅ UI 즉시 반영을 위한 상태 업데이트
      setSelectedConfirmedSession(formattedSession)
      setSelectedPendingSession(null)
      setEditingSession(null)
  
      onSessionChange?.()
    }
  }

  const handleConfirm = async () => {
    if (!selectedPendingSession) return
  
    const { error } = await supabase
      .from('calendar_sessions')
      .update({ status: '확정' })
      .eq('trainer_id', trainerId)
      .eq('workout_date', format(selectedDate, 'yyyy-MM-dd'))
      .eq('workout_time', selectedPendingSession.workout_time)
  
    if (error) {
      toast.error('확정 실패')
    } else {
      toast.success('수업이 확정되었습니다.')
      const confirmedSession = { ...selectedPendingSession, status: '확정' }
      setBlockedSessions((prev) =>
        prev.map((s) =>
          s.workout_time === selectedPendingSession.workout_time
            ? { ...s, status: '확정' }
            : s
        )
      )
      setAllConfirmedSessions((prev) => [...prev, confirmedSession])
      setSelectedPendingSession(null)
      onSessionChange?.()
    }
  }
  
  const handleCancel = () => {
    if (selectedPendingSession) {
      setConfirmingCancelSession(selectedPendingSession)
    }
  }

  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl shadow-md border border-gray-200">
      {/* 시간 선택 */}
      <div>
        <Label className="mb-2 block text-gray-800 font-semibold text-sm">시간 선택</Label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {availableTimes.map((time) => {
            const matchedSessions = blockedSessions.filter(
              (s) => format(new Date(`1970-01-01T${s.workout_time}`), 'H:mm') === time
            )

            // 가장 우선순위가 높은 세션 찾기 (확정 > 신청 > 취소)
            const prioritySession = matchedSessions.find((s) => s.status === '확정')
              || matchedSessions.find((s) => s.status === '신청')
              || matchedSessions.find((s) => s.status === '취소')

            const isPendingSelected = selectedPendingSession?.workout_time &&
              format(new Date(`1970-01-01T${selectedPendingSession.workout_time}`), 'H:mm') === time

            const isConfirmedSelected =
              selectedConfirmedSession?.workout_time &&
              format(new Date(`1970-01-01T${selectedConfirmedSession.workout_time}`), 'H:mm') === time
            const isSelectedForReservation = selectedHour === time

            const status = prioritySession?.status
            const memberName = prioritySession?.members?.name
            const sessionType = prioritySession?.session_type

            let customClass = ''
            // let selectedCustomClass = ''
            if (status === '확정' && sessionType === 'PT') {
              customClass = 'bg-blue-100 border border-blue-500 text-blue-800 font-semibold'
              // if (isSelectedForReservation) {
              //   selectedCustomClass = 'border-4 border-blue-700 bg-blue-300 text-blue-900 font-bold'
              // }
            } else if (status === '확정' && sessionType === 'SELF') {
              customClass = 'bg-green-100 border border-green-500 text-green-800 font-semibold'
              // if (isSelectedForReservation) {
              //   selectedCustomClass = 'border-4 border-green-700 bg-green-300 text-green-900 font-bold'
              // }
            } else if (status === '신청') {
              customClass = 'bg-yellow-100 border border-yellow-400 text-yellow-800 font-semibold'
              // if (isSelectedForReservation) {
              //   selectedCustomClass = 'border-4 border-yellow-600 bg-yellow-300 text-yellow-900 font-bold'
              // }
            }

            const selectedStyle = !customClass && isSelectedForReservation
              ? 'border-2 border-gray-600 bg-gray-100 text-gray-800 font-bold'
              : ''

            const selectedCustomClass = customClass && isSelectedForReservation
              ? (
                  status === '확정' && sessionType === 'PT' ? 'border-4 border-blue-700 !bg-blue-200 text-blue-900 font-bold' :
                  status === '확정' && sessionType === 'SELF' ? 'border-4 border-green-700 !bg-green-200 text-green-900 font-bold' :
                  status === '신청' ? 'border-4 border-yellow-600 !bg-yellow-200 text-yellow-900 font-bold' :
                  ''
                )
              : ''

            return (
              <div key={time} className="relative flex flex-col gap-1">
                <Button
                  variant="outline"
                  // variant={isConfirmedSelected || isSelectedForReservation ? 'Blue' : 'outline'}
                  className={`text-sm text-center justify-start w-full ${customClass} ${selectedStyle} ${selectedCustomClass}`}
                  onClick={() => {
                    console.log('clicked time:', time, 'selectedHour before:', selectedHour)
                    if (selectedHour === time) {
                      setSelectedHour(null)
                      return
                    }
                    
                    if (!status || status === '취소') {
                      setSelectedHour(time)
                      setSelectedPendingSession(null)
                      setSelectedConfirmedSession(null)
                    } else if (status === '신청') {
                      const matched = matchedSessions.find(s => s.status === '신청')
                      setSelectedPendingSession(matched ?? null)
                      setSelectedHour(time)
                      setSelectedConfirmedSession(null)
                    } else if (status === '확정') {
                      const matched = matchedSessions.find(s => s.status === '확정')
                      if (matched) {
                        setSelectedConfirmedSession(matched)
                      }
                      setSelectedHour(time)
                      setSelectedPendingSession(null)
                      setEditingSession(null)
                    }
                  }}
                >
                {status === '취소' && prioritySession?.notes && (
                  <Popover>             
                    <PopoverTrigger>   
                      <button>
                        <TriangleAlert className="w-4 h-4 text-red-500 ml-1" />
                      </button>
                    </PopoverTrigger>
                  
                    <PopoverContent
                      className="w-56 p-3 bg-red-300 text-gray-800 rounded-md shadow-md text-xs sm:text-sm"
                      sideOffset={5} 
                    >
                      <p><strong>취소한 사람:</strong> {prioritySession?.members?.name}</p>
                      <p><strong>세션 타입:</strong> {prioritySession?.session_type}</p>
                      <p><strong>사유:</strong> {prioritySession?.notes}</p>
                    </PopoverContent>
                  </Popover>
                )}
                  <span className='text-xs'>{time}</span> <br />
                  {memberName && (
                    (status === '확정' ||
                      (status === '신청' && matchedSessions.filter(s => s.status === '신청').length <= 1)) && (
                        <span className="ml-2 text-xs text-gray-500 truncate">
                          {memberName}
                          <br />
                          <span className="ml-1 text-[10px] text-gray-400">
                            {sessionType ? ` [${sessionType.toUpperCase()}]` : ''}
                          </span>
                          {(() => {
                            const memberId = prioritySession?.member_id
                            const type = prioritySession?.session_type
                            if (!memberId || !type) return null

                            const key = `${memberId}_${type}`
                            const pkg = memberPackageMap?.[key]
                            const total = remainingSessions?.[key]?.total

                            if (!pkg || !total) return null

                            const startDate = new Date(pkg.start_date)
                            const endDate = new Date(pkg.end_date)

                            // 패키지 기간 내 해당 멤버, 세션 타입의 모든 확정 세션 필터링 + 정렬
                            const sameMemberSessions = allConfirmedSessions
                              .filter((s) => {
                                if (
                                  s.member_id !== memberId ||
                                  s.session_type !== type
                                )
                                  return false
                                const sessionDate = new Date(s.workout_date)
                                return sessionDate >= startDate && sessionDate <= endDate
                              })
                              .sort((a, b) => {
                                const aDate = new Date(`${a.workout_date}T${a.workout_time}`)
                                const bDate = new Date(`${b.workout_date}T${b.workout_time}`)
                                return aDate.getTime() - bDate.getTime()
                              })

                            const currentIndex = sameMemberSessions.findIndex((s) => {
                              const sDateTime = new Date(`${s.workout_date}T${s.workout_time}`).getTime()
                              const pDateTime = new Date(`${prioritySession.workout_date}T${prioritySession.workout_time}`).getTime()
                              return sDateTime === pDateTime
                            })

                            if (currentIndex >= 0) {
                              return (
                                <span className="ml-1 text-[10px] text-gray-400">
                                  ({currentIndex + 1}/{total})
                                </span>
                              )
                            }
                            return null
                          })()}
                        </span>
                      )
                  )}
                </Button>
                {matchedSessions.filter(s => s.status === '신청').length > 1 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      setMultiSessionsModalTime(time)
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full cursor-pointer"
                  >
                    {matchedSessions.filter(s => s.status === '신청').length}
                  </div>
                )}
      
                {/* 상태별 버튼 */}
                {isPendingSelected && (
                  <div className="flex gap-2 mt-1 justify-end">
                    <button
                      onClick={handleConfirm}
                      className="text-green-700 border border-green-600 px-2 py-1 rounded text-xs hover:bg-green-100"
                    >
                      확정
                    </button>
                    <button
                      onClick={handleCancel}
                      className="text-red-700 border border-red-600 px-2 py-1 rounded text-xs hover:bg-red-100"
                    >
                      취소
                    </button>
                  </div>
                )}

                {isConfirmedSelected && (
                  <div className="flex gap-2 mt-1 justify-end">
                    <button
                      onClick={() => {
                        if (selectedConfirmedSession) {
                          setEditingSession(selectedConfirmedSession)
                        }
                      }}
                      className="text-blue-700 border border-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-100"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => {
                        if (selectedConfirmedSession) {
                          setConfirmingCancelSession(selectedConfirmedSession)
                        }
                      }}
                      className="text-red-700 border border-red-600 px-2 py-1 rounded text-xs hover:bg-red-100"
                    >
                      취소
                    </button>

                  </div>
                )}
              </div>
            )
          })}

        </div>
      </div>

      {/* 회원 선택 */}
      <div>
        <Label className="mb-2 block text-gray-800 font-semibold text-sm">회원 선택</Label>
        <MemberPackageSelectListbox
          members={memberList}
          value={selectedMemberId}
          onChange={setSelectedMemberId}
        />
      </div>

      {/* 수업 종류 */}
      <div>
        <Label className="mb-2 block text-gray-800 font-semibold text-sm">수업 종류</Label>
        <RadioGroup
          value={selectedSessionType}
          onValueChange={setSelectedSessionType}
          options={[
            { label: 'PT', value: 'PT' },
            { label: 'GROUP', value: 'GROUP' },
            { label: 'SELF', value: 'SELF' },
          ]}
          direction="horizontal"
        />
      </div>

      {/* 등록 버튼 */}
      <div>
        <Button
          onClick={handleReserve}
          disabled={!selectedHour || !selectedMemberId}
          className="w-full mt-4 text-sm font-semibold"
          variant="darkGray"
        >
          수업 등록하기
        </Button>
      </div>

      {/* 수정 모달 */}
      {editingSession && (
        <EditConfirmedSession
          session={editingSession}
          onClose={() => {
            setEditingSession(null)
            setSelectedConfirmedSession(null)
          }}
          onUpdated={(newSession: CalendarSession) => {
            setEditingSession(null)
            setSelectedConfirmedSession(null)
            setBlockedSessions(prev =>
              [
                ...prev.filter(s => s.calendar_sessions_id !== newSession.calendar_sessions_id),
                newSession
              ]
            )
            onSessionChange?.()
          }}
          onSessionChange={onSessionChange}
        />
      )}

      {confirmingCancelSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <p className="text-sm text-gray-800 mb-4">
              <span className="font-semibold">• 날짜: {format(selectedDate, 'yyyy-MM-dd')}</span> <br />
              <span className="font-semibold">• 시간: {confirmingCancelSession.workout_time}</span> <br />
              <span className="font-semibold">• 회원명: {confirmingCancelSession.members?.name}</span> <br />
              <span className="font-semibold">• 세션타입: {confirmingCancelSession.session_type}</span> <br />
              <br />
              이 세션을 정말 취소하시겠습니까?
            </p>
            <div className="flex justify-end gap-3">
              <Button className="text-sm" variant="outline" onClick={() => setConfirmingCancelSession(null)}>아니오</Button>
              <Button
                className="text-sm"
                variant="destructive"
                onClick={async () => {
                  const { error } = await supabase
                    .from('calendar_sessions')
                    .update({ status: '취소' })
                    .eq('trainer_id', trainerId)
                    .eq('workout_date', format(selectedDate, 'yyyy-MM-dd'))
                    .eq('workout_time', confirmingCancelSession.workout_time)

                  if (error) {
                    toast.error('취소 실패')
                  } else {
                    toast.success('수업이 취소되었습니다.')

                    setBlockedSessions((prev) =>
                      prev.filter((s) => s.workout_time !== confirmingCancelSession.workout_time)
                    )

                    setAllConfirmedSessions((prev) =>
                      prev.filter((s) => {
                        // 취소된 세션과 workout_date, workout_time이 같으면 제외
                        return !(
                          s.workout_date === confirmingCancelSession.workout_date &&
                          s.workout_time === confirmingCancelSession.workout_time
                        )
                      })
                    )

                    if (confirmingCancelSession.status === '신청') {
                      setSelectedPendingSession(null)
                    } else {
                      setSelectedConfirmedSession(null)
                      setEditingSession(null)
                    }

                    setConfirmingCancelSession(null)
                    onSessionChange?.()
                  }
                }}
              >
                예, 취소합니다
              </Button>

            </div>
          </div>
        </div>
      )}

      {multiSessionsModalTime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <h2 className="text-md font-semibold text-center mb-4">
              {format(selectedDate, 'yyyy-MM-dd')} {multiSessionsModalTime} 예약 목록
            </h2>

            {blockedSessions.filter(
              (s) =>
                format(new Date(`1970-01-01T${s.workout_time}`), 'H:mm') === multiSessionsModalTime &&
                s.status !== '취소'
            ).length === 0 ? (
              <p className="text-gray-500 text-sm text-center">해당 시간의 예약이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {blockedSessions
                  .filter(
                    (s) =>
                      format(new Date(`1970-01-01T${s.workout_time}`), 'H:mm') === multiSessionsModalTime &&
                      s.status !== '취소'
                  )
                  .sort((a, b) => {
                    const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                    const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                    return aTime - bTime;
                  })
                  .map((s) => (
                    <li
                      key={s.calendar_sessions_id}
                      className="px-2 py-3 text-sm text-gray-800 space-y-1"
                    >
                      {/* 첫 줄: 날짜/시간/타입/신청시각 */}
                      <div className="flex flex-wrap justify-between items-center">
                        <div className="flex gap-4 flex-wrap">
                          <span className="font-medium w-[40px]">
                            {format(new Date(s.workout_date), 'MM/dd')}
                          </span>
                          <span className="w-[40px]">{s.workout_time.slice(0, 5)}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              s.session_type === 'PT'
                                ? 'bg-indigo-100 text-indigo-700'
                                : s.session_type === 'SELF'
                                ? 'bg-green-100 text-green-700'
                                : s.session_type === 'GROUP'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700' // 기본값
                            }`}
                          >
                            {s.session_type}
                          </span>
                          <span className="text-[11px] text-gray-500 mt-0.5">
                            신청시각: {dayjs(s.updated_at).format('YYYY-MM-DD HH:mm')}
                          </span>
                        </div>
                      </div>

                      {/* 두 번째 줄: 이름 + 버튼 */}
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900 truncate">
                          {s.members?.name || '이름없음'}
                        </span>
                        <div className="flex gap-2">
                          {s.status === '신청' && (
                            <button
                              className="text-green-700 border border-green-600 px-2 py-1 rounded text-xs hover:bg-green-100"
                              onClick={async () => {
                                await supabase
                                  .from('calendar_sessions')
                                  .update({ status: '확정' })
                                  .eq('calendar_sessions_id', s.calendar_sessions_id)
                                toast.success('확정되었습니다')
                                setBlockedSessions((prev) =>
                                  prev.map((item) =>
                                    item.calendar_sessions_id === s.calendar_sessions_id
                                      ? { ...item, status: '확정' }
                                      : item
                                  )
                                )
                                onSessionChange?.()
                              }}
                            >
                              확정
                            </button>
                          )}
                          <button
                            className="text-red-700 border border-red-600 px-2 py-1 rounded text-xs hover:bg-red-100"
                            onClick={async () => {
                              await supabase
                                .from('calendar_sessions')
                                .update({ status: '취소' })
                                .eq('calendar_sessions_id', s.calendar_sessions_id)
                              toast.success('취소되었습니다')
                              setBlockedSessions((prev) =>
                                prev.filter((item) => item.calendar_sessions_id !== s.calendar_sessions_id)
                              )
                              setAllConfirmedSessions((prev) =>
                                prev.filter((item) => item.calendar_sessions_id !== s.calendar_sessions_id)
                              )
                              onSessionChange?.()
                            }}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            )}

            <div className="flex justify-end mt-4">
              <Button className="text-sm" variant="outline" onClick={() => setMultiSessionsModalTime(null)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}



    </div>

  )
}
