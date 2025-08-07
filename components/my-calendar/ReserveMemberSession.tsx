'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import RadioGroup from '@/components/ui/radio-group'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { format, isWithinInterval } from 'date-fns'
import { addDays, parse, isAfter } from 'date-fns'
import DeleteSession from './DeleteSession' // 상대 경로는 위치에 맞게 조절하세요

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
  
  
  const supabase = getSupabaseClient()

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

    const pending: string[] = []
    const confirmedMine: ConfirmedSession[] = []
    const confirmedOthers: string[] = []

    const rowData = data as CalendarSessionRow[] | null
    (rowData || []).forEach((row) => {
      const timeStr = format(new Date(`1970-01-01T${row.workout_time}`), 'HH:mm')
    
      if (row.member_id === memberId) {
        if (row.status === '신청') {
          pending.push(timeStr)
        } else if (row.status === '확정') {
          confirmedMine.push({ time: timeStr, sessionType: row.session_type })
        }
      } else {
        if (row.status === '확정') confirmedOthers.push(timeStr)
      }
    })

    setMyPendingTimes(pending)
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
        toast.error('유효한 패키지를 찾을 수 없어요.')
        return
      }
  
      const activePackage = packages.find((pkg) => {
        const start = new Date(pkg.start_date)
        const end = new Date(pkg.end_date)
        return isWithinInterval(selectedDate, { start, end })
      })
  
      if (!activePackage) {
        toast.error('현재 선택한 날짜에 사용할 수 있는 패키지가 없어요.')
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
        toast.error('세션 정보 조회 중 오류가 발생했어요.')
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
      toast.error('모든 항목을 선택해주세요.')
      return
    }

    // 남은 세션 체크
    const sessionInfo = remainingSessions[selectedSessionType as keyof typeof remainingSessions]
    if (sessionInfo && sessionInfo.remain <= 0) {
      toast.error(`${selectedSessionType} 세션은 더 이상 신청할 수 없습니다.`)
      return
    }
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    // 시간 중복 체크 (blockedTimes는 이미 확정된 시간만)
    if (blockedTimes.includes(selectedHour)) {
      toast.error('이미 예약된 시간입니다. 다른 시간을 선택해주세요.')
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
      toast.error('수업 등록 중 오류가 발생했어요.')
      console.error(error)
    } else {
      toast.success(`${dateStr} ${selectedHour} 수업이 신청되었어요!`)
      setMyPendingTimes((prev) => [...prev, selectedHour])

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
    }
  }

  // 추가: 취소 진행 함수
  async function handleCancelSession(time: string, requireReason: boolean) {
    if (requireReason && !cancelReason.trim()) {
      toast.error('취소 사유를 입력해주세요.')
      return
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const statusToMatch = myPendingTimes.includes(time) ? '신청' : '확정'

    const updateData: any = { status: '취소' }
    if (requireReason) updateData.notes = cancelReason.trim()

    const { error } = await supabase
      .from('calendar_sessions')
      .update(updateData)
      .eq('trainer_id', trainerId)
      .eq('member_id', memberId)
      .eq('workout_date', dateStr)
      .eq('workout_time', time)
      .eq('status', statusToMatch)

    if (error) {
      toast.error('세션 취소 중 오류가 발생했습니다.')
      console.error(error)
    } else {
      toast.success('세션이 취소되었습니다.')
      setCancelTargetTime(null)
      setCancelReason('')
      await loadSessionTimes()
      await loadBlockedTimes()
      onSessionChange?.()
    }
  }


  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
      <p className="text-gray-800 font-semibold text-lg">
        담당 트레이너: <span className="font-bold">{trainerName}</span>
      </p>
      <hr className="border-t border-gray-300" />

      <div>
        <p className="text-gray-800 font-bold text-sm mb-2">남은 세션 횟수</p>
        <div className="grid grid-cols-1 gap-2 text-sm">
          {remainingSessions.PT && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-blue-800">
              <span className="font-semibold">PT 세션:</span>{' '}
              {remainingSessions.PT.total - remainingSessions.PT.remain}/{remainingSessions.PT.total}회 사용
              <span className="ml-2 text-xs text-blue-700">(남은 {remainingSessions.PT.remain}회)</span>
            </div>
          )}
          {remainingSessions.GROUP && (
            <div className="rounded-md border border-purple-200 bg-purple-50 p-3 text-purple-800">
              <span className="font-semibold">GROUP 세션:</span>{' '}
              {remainingSessions.GROUP.total - remainingSessions.GROUP.remain}/{remainingSessions.GROUP.total}회 사용
              <span className="ml-2 text-xs text-purple-700">(남은 {remainingSessions.GROUP.remain}회)</span>
            </div>
          )}
          {remainingSessions.SELF && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-green-800">
              <span className="font-semibold">SELF 세션:</span>{' '}
              {remainingSessions.SELF.total - remainingSessions.SELF.remain}/{remainingSessions.SELF.total}회 사용
              <span className="ml-2 text-xs text-green-700">(남은 {remainingSessions.SELF.remain}회)</span>
            </div>
          )}
        </div>
      </div>
      <hr className="border-t border-gray-300" />

      <p className="block mb-2 text-gray-800 font-bold text-sm">시간 선택</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {availableTimes.map((time) => {
          const isSelected = selectedHour === time
          const isBlocked = otherConfirmedTimes.includes(time)
          const isMyPending = myPendingTimes.includes(time)

          const matchedConfirmed = myConfirmedTimes.find(c => c.time === time)
          const isMyConfirmed = Boolean(matchedConfirmed)

          const isPT = matchedConfirmed?.sessionType === 'PT'
          const isSELF = matchedConfirmed?.sessionType === 'SELF'

          const baseStyle = isBlocked
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
                ? 'bg-blue-300 border-4 border-blue-700 text-blue-900 font-bold'
                : isSELF
                ? 'bg-green-300 border-4 border-green-700 text-green-900 font-bold'
                : ''
            } else if (isMyPending) {
              pendingStyle = 'bg-yellow-300 border-4 border-yellow-600 text-yellow-900 font-bold'
            }
          }
          
          const hasConfirmedStyle = !!confirmedStyle
          const hasPendingStyle = !!pendingStyle
          
          const selectedStyle = isSelected && !hasConfirmedStyle && !hasPendingStyle
            ? 'border-2 border-gray-600 bg-gray-100 text-gray-800 font-bold'
            : ''

          // isCancelable 변수 선언 (여기 꼭 넣어야 함)
          const dateStr = format(selectedDate, 'yyyy-MM-dd')
          const sessionDateTime = getSessionDateTime(dateStr, time)
          const now = new Date()
          const canCancel = isMyConfirmed || isMyPending
          const isCancelable = canCancel && isAfter(sessionDateTime, addDays(now, 1))

          return (
            <div key={time} className="relative z-0">
              {(isMyConfirmed || isMyPending) && isCancelable && (
                <button
                  type="button"
                  className="absolute top-0 left-0 text-red-500 font-bold z-10 p-1"
                  onClick={() => {
                    const isPending = myPendingTimes.includes(time)
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
                onClick={() => !isBlocked && setSelectedHour(time)}
                disabled={isBlocked}
              >
                {time}
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
          <p className="mb-2 block text-gray-800 font-bold text-sm">수업 종류</p>
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
          time={cancelTargetTime}
          reason={cancelReason}
          setReason={setCancelReason}
          onClose={() => {
            setCancelTargetTime(null)
            setCancelReason('')
          }}
          onCancel={async () => {
            if (!cancelReason.trim()) {
              toast.error('취소 사유를 입력해주세요.')
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
              toast.error('세션 취소 중 오류가 발생했습니다.')
              console.error(error)
            } else {
              toast.success('세션이 취소되었습니다.')
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
              이 세션을 취소하시겠습니까?
            </p>
            <div className="flex justify-center gap-3 mt-4">
              <Button 
                variant="ghost"
                className="text-sm"
                onClick={() => setConfirmOnlyTime(null)}
              >
                닫기
              </Button>
              <Button
                onClick={async () => {
                  await handleCancelSession(confirmOnlyTime, false) // 사유 없이 취소
                  setConfirmOnlyTime(null)
                }}
                variant="darkGray" 
                className="text-sm"
              >
                네. 취소합니다.
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
        수업 신청하기
      </Button>
    </div>
  )
}
