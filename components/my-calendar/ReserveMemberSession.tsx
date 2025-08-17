'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import RadioGroup from '@/components/ui/radio-group'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { addDays, parse, isAfter } from 'date-fns'
import DeleteSession from './DeleteSession' 
import { useLanguage } from '@/context/LanguageContext'
// import { useRouter } from 'next/navigation'

function getSessionDateTime(dateStr: string, timeStr: string) {
  // dateStr: 'yyyy-MM-dd', timeStr: 'HH:mm'
  return parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date())
}

interface ReserveMemberSessionProps {
  selectedDate: Date
  memberId: string
  onSessionChange?: () => void
}

interface SessionOption {
  label: string
  value: string
}

interface CalendarSessionRow {
  workout_time: string
  status: '신청' | '확정' | '취소'
  member_id: string
  session_type: string
}

type ConfirmedSession = {
  time: string
  sessionType: string // 'PT' | 'SELF' | ...
}

interface PendingSession {
  time: string
  sessionType: string
}

export default function ReserveMemberSession({
  selectedDate,
  memberId,
  onSessionChange,
}: ReserveMemberSessionProps) {
  const [selectedHour, setSelectedHour] = useState<string>('')
  const [selectedSessionType, setSelectedSessionType] = useState<string>('')
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [sessionOptions, setSessionOptions] = useState<SessionOption[]>([])
  const [trainerId, setTrainerId] = useState<number | null>(null)
  const [trainerName, setTrainerName] = useState<string>('')
  const [blockedTimes, setBlockedTimes] = useState<string[]>([])
  const [otherConfirmedTimes, setOtherConfirmedTimes] = useState<string[]>([])
  const [myPendingTimes, setMyPendingTimes] = useState<string[]>([])
  const [cancelTargetTime, setCancelTargetTime] = useState<string | null>(null) // 취소 중인 시간
  const [cancelReason, setCancelReason] = useState<string>('') // 취소 사유
  const [myConfirmedTimes, setMyConfirmedTimes] = useState<ConfirmedSession[]>([])
  const [confirmOnlyTime, setConfirmOnlyTime] = useState<string | null>(null)
  const [remainingSessions, setRemainingSessions] = useState<{
    PT?: { remain: number; total: number }
    GROUP?: { remain: number; total: number }
    SELF?: { remain: number; total: number }
  }>({})
  const [myPendingSessions, setMyPendingSessions] = useState<PendingSession[]>([])
  
  const supabase = getSupabaseClient()
  const { t } = useLanguage()  // 번역 함수 가져오기
  // const router = useRouter()

  // 시간 초기화
  useEffect(() => {
    const times = Array.from({ length: 12 }, (_, i) => `${String(9 + i).padStart(2, '0')}:00`)
    setAvailableTimes(times)
  }, [])

  async function loadSessionTimes() {
    if (!trainerId) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('calendar_sessions')
      .select('workout_time, status, session_type, member_id')
      .eq('workout_date', dateStr)
      .eq('trainer_id', trainerId)
      .not('status', 'eq', '취소')

    if (error) {
      console.error('세션 시간 조회 실패:', error)
      return
    }

    const pending: PendingSession[] = []
    const confirmedMine: ConfirmedSession[] = []
    const confirmedOthers: string[] = []

    const rowData = data as CalendarSessionRow[] | null
    (rowData || []).forEach((row) => {
      const timeStr = format(new Date(`1970-01-01T${row.workout_time}`), 'HH:mm')
    
      if (row.member_id === memberId) {
        if (row.status === '신청') {
          pending.push({ time: timeStr, sessionType: row.session_type })
        } else if (row.status === '확정') {
          confirmedMine.push({ time: timeStr, sessionType: row.session_type })
        }
      } else {
        if (row.status === '확정') confirmedOthers.push(timeStr)
      }
    })

    setMyPendingSessions(pending)
    setMyConfirmedTimes(confirmedMine)
    setOtherConfirmedTimes(confirmedOthers)
  }

  async function loadBlockedTimes() {
    if (!trainerId) return

    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('calendar_sessions')
      .select('workout_time, status')
      .eq('workout_date', dateStr)
      .eq('trainer_id', trainerId)
      .eq('status', '확정')

    if (error) {
      console.error('이미 예약된 시간 조회 실패:', error)
      return
    }

    const times = (data || []).map(row => format(new Date(`1970-01-01T${row.workout_time}`), 'HH:mm'))

    setBlockedTimes(times)
  }

  // 3) useEffect에서 호출
  useEffect(() => {
    loadSessionTimes()
    loadBlockedTimes()
  }, [selectedDate, trainerId, memberId])

  useEffect(() => {
    if (myConfirmedTimes.length === 1) {
      const session = myConfirmedTimes[0]
      setSelectedHour(session.time)
      setSelectedSessionType(session.sessionType)
    }
  }, [myConfirmedTimes])

  // 패키지 기반 세션 옵션 로드
  useEffect(() => {
    const fetchPackageInfo = async () => {
      const { data: packages, error } = await supabase
        .from('member_packages')
        .select(
          'trainer_id, pt_session_cnt, group_session_cnt, self_session_cnt, start_date, end_date'
        )
        .eq('member_id', memberId)
        .eq('status', 'active')
  
      if (error || !packages || packages.length === 0) {
        setSessionOptions([])
        setRemainingSessions({})
        toast.error(t('alert.schedule_error_1'))
        return
      }
  
      const activePackage = packages.find((pkg) => {
        const start = format(new Date(pkg.start_date), 'yyyy-MM-dd')
        const end = format(new Date(pkg.end_date), 'yyyy-MM-dd')
        const selected = format(selectedDate, 'yyyy-MM-dd')
      
        return selected >= start && selected <= end
      })
  
      if (!activePackage) {
        toast.error(t('alert.schedule_error_2'), { id: 'no-package-error' })
        setSessionOptions([])
        setRemainingSessions({})
        return
      }
  
      setTrainerId(activePackage.trainer_id)
  
      // ✅ 사용한 세션 수 계산
      const { data: usedSessions, error: sessionError } = await supabase
        .from('calendar_sessions')
        .select('session_type')
        .eq('member_id', memberId)
        .eq('trainer_id', activePackage.trainer_id)
        // .eq('status', '확정')
        .in('status', ['확정', '신청'])
        .gte('workout_date', activePackage.start_date)
        .lte('workout_date', activePackage.end_date)

      if (sessionError) {
        toast.error(t('alert.schedule_error_3'))
        console.error(sessionError)
        return
      }

      const ptUsed = usedSessions.filter((s) => s.session_type === 'PT').length
      const groupUsed = usedSessions.filter((s) => s.session_type === 'GROUP').length
      const selfUsed = usedSessions.filter((s) => s.session_type === 'SELF').length

      const remainPT = (activePackage.pt_session_cnt || 0) - ptUsed
      const remainGROUP = (activePackage.group_session_cnt || 0) - groupUsed
      const remainSELF = (activePackage.self_session_cnt || 0) - selfUsed

      setRemainingSessions({
        ...(activePackage.pt_session_cnt !== undefined && {
          PT: { remain: remainPT, total: activePackage.pt_session_cnt },
        }),
        ...(activePackage.group_session_cnt !== undefined && {
          GROUP: { remain: remainGROUP, total: activePackage.group_session_cnt },
        }),
        ...(activePackage.self_session_cnt !== undefined && {
          SELF: { remain: remainSELF, total: activePackage.self_session_cnt },
        }),
      })

      const options: SessionOption[] = []
      if (remainPT > 0) options.push({ label: 'PT', value: 'PT' })
      if (remainGROUP > 0) options.push({ label: 'GROUP', value: 'GROUP' })
      if (remainSELF > 0) options.push({ label: 'SELF', value: 'SELF' })

      setSessionOptions(options)
    }
  
    fetchPackageInfo()
  }, [selectedDate, memberId, myConfirmedTimes])
  

  // 트레이너 이름 조회
  useEffect(() => {
    const fetchTrainerName = async () => {
      if (!trainerId) return

      const { data } = await supabase
        .from('trainers')
        .select('name')
        .eq('trainer_id', trainerId)
        .single()

      if (data?.name) {
        setTrainerName(data.name)
      }
    }

    fetchTrainerName()
  }, [trainerId])

  // 저장 버튼 핸들러 (항상 새 수업 추가)
  const handleReserve = async () => {
    if (!selectedHour || !selectedSessionType || !trainerId) {
      toast.error(t('alert.schedule_error_4'))
      return
    }

    // 남은 세션 체크
    const sessionInfo = remainingSessions[selectedSessionType as keyof typeof remainingSessions]
    if (sessionInfo && sessionInfo.remain <= 0) {
      toast.error(`${selectedSessionType} ${t('alert.schedule_error_5')}`)
      return
    }
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    // 시간 중복 체크 (blockedTimes는 이미 확정된 시간만)
    if (blockedTimes.includes(selectedHour)) {
      toast.error(t('alert.schedule_error_6'))
      return
    }

    // 회원정보
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('name, phone')
      .eq('member_id', memberId)
      .single()

    if (memberError || !member) {
      toast.error('회원 정보를 불러올 수 없습니다.')
      return
    }

    const { error } = await supabase.from('calendar_sessions').insert({
      trainer_id: trainerId,
      member_id: memberId,
      workout_date: dateStr,
      workout_time: selectedHour,
      session_type: selectedSessionType,
      status: '신청',
    })

    if (error) {
      toast.error(t('alert.schedule_error_7'))
      console.error(error)
      return
    } 
    
    toast.success(`${dateStr} ${selectedHour} ${t('alert.schedule_success_1')}`)
    setMyPendingTimes((prev) => [...prev, selectedHour])

    setMyPendingSessions((prev) => [
      ...prev,
      { time: selectedHour, sessionType: selectedSessionType }
    ])

    // ✅ 잔여 세션 수 즉시 반영
    setRemainingSessions((prev) => {
      const sessionKey = selectedSessionType as keyof typeof prev
      if (!prev[sessionKey]) return prev
      return {
        ...prev,
        [sessionKey]: {
          ...prev[sessionKey]!,
          remain: Math.max(prev[sessionKey]!.remain - 1, 0),
        },
      }
    })

    setSelectedHour('')
    setSelectedSessionType('')
    onSessionChange?.()

    try {
      await fetch('/api/sendKakao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: member.phone.startsWith('82') ? member.phone : `82${member.phone.replace(/^0/, '')}`,
          name: member.name,
          date: dateStr,
          time: selectedHour,
          status: '신청',
          sessionType: selectedSessionType, 
          templateCode: 'RESERVE_REQUEST',
        }),
      })
    } catch (err) {
      console.error('카카오톡 발송 실패:', err)
    }
  }

  // 추가: 취소 진행 함수
  async function handleCancelSession(time: string, requireReason: boolean) {
    if (requireReason && !cancelReason.trim()) {
      toast.error(t('alert.schedule_error_8'))
      return
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    // const statusToMatch = myPendingTimes.includes(time) ? '신청' : '확정'
    const canceledSession =
      myConfirmedTimes.find(c => c.time === time) ||
      myPendingSessions.find(p => p.time === time)
    const canceledSessionType = canceledSession?.sessionType || 'SELF'

    const updateData: { status: string; notes?: string } = { status: '취소' }
    if (requireReason) updateData.notes = cancelReason.trim()

    const { error } = await supabase
      .from('calendar_sessions')
      .update(updateData)
      .eq('trainer_id', trainerId)
      .eq('member_id', memberId)
      .eq('workout_date', dateStr)
      .eq('workout_time', time)
      // .eq('status', statusToMatch)
      .in('status', ['신청', '확정'])

    if (error) {
      toast.error(t('alert.schedule_error_9'))
      console.error(error)
      return
    }
  
    toast.success(t('alert.schedule_success_2'))
  
    // ✅ UI 즉시 반영
    setMyPendingSessions((prev) => prev.filter(p => p.time !== time))
    setMyConfirmedTimes((prev) => prev.filter(c => c.time !== time))
    setOtherConfirmedTimes((prev) => prev.filter(t => t !== time))
    setMyPendingTimes((prev) => prev.filter(t => t !== time)) // pendingTimes도 갱신
  
    setCancelTargetTime(null)
    setCancelReason('')
  
    // 이후 서버 상태 동기화
    await loadSessionTimes()
    await loadBlockedTimes()
    onSessionChange?.()

    try {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('name, phone')
        .eq('member_id', memberId)
        .single()
  
      if (!memberError && member) {
        await fetch('/api/sendKakao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: member.phone.startsWith('82')
              ? member.phone
              : `82${member.phone.replace(/^0/, '')}`,
            name: member.name,
            date: dateStr,
            time,
            status: '취소',
            sessionType: canceledSessionType, // ✅ 여기서 안전하게 전달
            templateCode: 'RESERVE_CANCEL',
          }),
        })
      }
    } catch (err) {
      console.error('카카오톡 발송 실패:', err)
    }
  }


  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
      <p className="text-gray-800 font-semibold text-lg">
        {t('my_calendar.assignedCoach')} <span className="font-bold">{trainerName}</span>
      </p>
      <hr className="border-t border-gray-300" />

      <div>
        <p className="text-gray-800 font-bold text-sm mb-2">
        {t('my_calendar.remainingSessions')}
        </p>
        <div className="grid grid-cols-1 gap-2 text-sm">
          {Object.entries(remainingSessions).map(([type, data]) => {
            if (data && data.total > 0) {
              const colors = {
                PT: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-800', sub: 'text-blue-700' },
                GROUP: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-800', sub: 'text-purple-700' },
                SELF: { border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-800', sub: 'text-green-700' }
              }
              const c = colors[type as keyof typeof colors]
              return (
                <div key={type} className={`rounded-md border ${c.border} ${c.bg} p-3 ${c.text}`}>
                  <span className="font-semibold">
                    {type} {t('my_calendar.remainingSessions_1')}:
                  </span>{' '}
                  {data.total - data.remain}/{data.total} {t('my_calendar.remainingSessions_2')}{' '}
                  <span className={`ml-2 text-xs ${c.sub}`}>
                    ({t('my_calendar.remainingSessions_3')}{data.remain} {t('my_calendar.remainingSessions_4')})</span>
                </div>
              )
            }
            return null
          })}

        </div>
      </div>
      <hr className="border-t border-gray-300" />

      <p className="block mb-2 text-gray-800 font-semibold text-sm">
        {t('my_calendar.selectTime')}
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {availableTimes.map((time) => {
          const isSelected = selectedHour === time
          const isBlocked = otherConfirmedTimes.includes(time)
          
          const matchedPending = myPendingSessions.find(p => p.time === time)
          const isMyPending = Boolean(matchedPending)

          const matchedConfirmed = myConfirmedTimes.find(c => c.time === time)
          const isMyConfirmed = Boolean(matchedConfirmed)

          const isPT = matchedConfirmed?.sessionType === 'PT'
          const isSELF = matchedConfirmed?.sessionType === 'SELF'

          // 현재 시간 이전인지 체크
          const now = new Date()
          const sessionDateTime = getSessionDateTime(format(selectedDate, 'yyyy-MM-dd'), time)
          const isPastTime = format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd') 
            ? isAfter(now, sessionDateTime)
            : false

          // 시각적으로 막힌 상태 표시
          const isUnavailable = isBlocked || isPastTime

          const baseStyle = isUnavailable
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'hover:bg-gray-100'

          // 기본 색상 (선택 안된 상태)
          let confirmedStyle = ''
          let pendingStyle = ''

          if (isMyConfirmed) {
            confirmedStyle = isPT
              ? 'bg-blue-100 border border-blue-500 text-blue-800 font-semibold'
              : isSELF
              ? 'bg-green-100 border border-green-500 text-green-800 font-semibold'
              : ''
          }
          
          if (isMyPending) {
            pendingStyle = 'bg-yellow-100 border border-yellow-400 text-yellow-800 font-semibold'
          }
          
          // 강조 스타일
          if (isSelected) {
            if (isMyConfirmed) {
              confirmedStyle = isPT
                ? '!bg-blue-300 border-4 border-blue-700 text-blue-900 font-bold'
                : isSELF
                ? '!bg-green-300 border-4 border-green-700 text-green-900 font-bold'
                : ''
            } else if (isMyPending) {
              pendingStyle = '!bg-yellow-300 border-4 border-yellow-600 text-yellow-900 font-bold'
            }
          }
          
          const hasConfirmedStyle = !!confirmedStyle
          const hasPendingStyle = !!pendingStyle
          
          const selectedStyle = isSelected && !hasConfirmedStyle && !hasPendingStyle
            ? 'border-2 border-gray-600 bg-gray-100 text-gray-800 font-bold'
            : ''

          // isCancelable 변수 선언 (여기 꼭 넣어야 함)
          // const dateStr = format(selectedDate, 'yyyy-MM-dd')
          const canCancel = isMyConfirmed || isMyPending
          const isCancelable = canCancel && isAfter(sessionDateTime, addDays(now, 1))

          return (
            <div key={time} className="relative z-0">
              {(isMyConfirmed || isMyPending) && isCancelable && (
                <button
                  type="button"
                  className="absolute top-0 left-0 text-red-500 font-bold z-10 p-1"
                  onClick={() => {
                    const isPending = isMyPending
                    if (isPending) {
                      setConfirmOnlyTime(time) // confirmOnlyTime 모달 띄우기
                    } else {
                      setCancelTargetTime(time) // 기존 취소 사유 모달
                      setCancelReason('')
                    }
                  }}
                  aria-label={`Cancel session at ${time}`}
                >
                  ×
                </button>
              
              
              )}

              <Button
                variant="outline"
                className={`text-xs relative z-[5] w-full py-2 transition ${baseStyle} ${confirmedStyle} ${pendingStyle} ${selectedStyle}`}
                onClick={() => !isUnavailable && setSelectedHour(time)}
                disabled={isUnavailable}
              >
                {time}
                {(isMyConfirmed || isMyPending) && (
                  <div className="text-center mt-1 text-[10px] font-semibold text-gray-700 select-none">
                    {isMyConfirmed
                      ? matchedConfirmed?.sessionType
                      : isMyPending
                      ? matchedPending?.sessionType   
                      : ''}
                  </div>
                )}
                {/* {isBlocked && (
                  <span className="absolute text-[10px] text-gray-500 bottom-0 right-0 select-none">예약됨</span>
                )} */}
                {/* {isMyConfirmed && (
                  <span className="absolute text-[10px] text-blue-700 bottom-0 right-0 select-none font-semibold">내 예약</span>
                )}
                {isMyPending && (
                  <span className="absolute text-[10px] text-yellow-700 bottom-0 right-0 select-none font-semibold">내 신청</span>
                )} */}
              </Button>
            </div>
          )
        })}

      </div>
      <hr className="border-t border-gray-300" />
      {sessionOptions.length > 0 && (
        <>
          <p className="mb-2 block text-gray-800 font-semibold text-sm">
            {t('my_calendar.sessionType')}
          </p>
          <RadioGroup
            value={selectedSessionType}
            onValueChange={setSelectedSessionType}
            options={sessionOptions}
            direction="horizontal"
            className="text-sm"
          />
        </>
      )}

      {cancelTargetTime && (
        <DeleteSession
          date={format(selectedDate, 'yyyy-MM-dd')}
          time={cancelTargetTime}
          sessionType={selectedSessionType}
          reason={cancelReason}
          setReason={setCancelReason}
          onClose={() => {
            setCancelTargetTime(null)
            setCancelReason('')
          }}
          onCancel={async () => {
            if (!cancelReason.trim()) {
              toast.error(t('alert.schedule_error_8'))
              return
            }
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const { error } = await supabase
              .from('calendar_sessions')
              .update({ status: '취소', notes: cancelReason.trim() })
              .eq('trainer_id', trainerId)
              .eq('member_id', memberId)
              .eq('workout_date', dateStr)
              .eq('workout_time', cancelTargetTime)
              .eq('status', myPendingTimes.includes(cancelTargetTime) ? '신청' : '확정')
          
            if (error) {
              toast.error(t('alert.schedule_error_9'))
              console.error(error)
            } else {
              toast.success(t('alert.schedule_success_2'))
              setCancelTargetTime(null)
              setCancelReason('')
              // 상태 다시 불러오기
              await loadSessionTimes()
              await loadBlockedTimes()
              onSessionChange?.()
            }
          }}
        />
      )}

      {confirmOnlyTime && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl space-y-4 max-w-xs text-center">
            <p className="text-gray-800 font-medium text-sm">
              {/* 이 세션을 취소하시겠습니까? */}
              {t('my_calendar.cancelApplySessionQ')}
            </p>
            <div className="flex justify-center gap-3 mt-4">
              <Button 
                variant="ghost"
                className="text-sm"
                onClick={() => setConfirmOnlyTime(null)}
              >
                {/* 닫기 */}
                {t('master.no')}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await handleCancelSession(confirmOnlyTime, false)
                  } finally {
                    setConfirmOnlyTime(null) // ✅ 성공/실패 상관없이 닫기
                  }
                }}
                variant="darkGray"
                className="text-sm"
              >
                {t('master.yesCancel')}
              </Button>

            </div>
          </div>
        </div>
      )}


      <Button
        variant="darkGray"
        className="w-full mt-4 text-sm font-semibold"
        onClick={handleReserve}
        disabled={!selectedHour || !selectedSessionType}
      >
        {t('my_calendar.bookClass')}
      </Button>
    </div>
  )
}
