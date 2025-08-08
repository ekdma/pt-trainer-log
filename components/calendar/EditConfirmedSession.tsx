'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import RadioGroup from '@/components/ui/radio-group'

export interface CalendarSession {
  calendar_sessions_id: string;
  workout_date: string;
  workout_time: string;
  session_type: string;
  member_id: string;
  status: string;
  notes: string;
  members: {
    name: string;
  };
}

interface EditConfirmedSessionProps {
  session: CalendarSession;
  onClose: () => void;
  onUpdated: (updatedSession: CalendarSession) => void;
  onSessionChange?: () => void; 
}

export default function EditConfirmedSession({ session, onClose, onUpdated, onSessionChange }: EditConfirmedSessionProps) {
  const supabase = getSupabaseClient()

  const [workoutDate, setWorkoutDate] = useState(session.workout_date)
  const [sessionType, setSessionType] = useState(session.session_type)
  const [workoutTime, setWorkoutTime] = useState(session.workout_time)
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [disabledTimes, setDisabledTimes] = useState<Set<string>>(new Set())

  useEffect(() => {
    setWorkoutDate(session.workout_date)
    setSessionType(session.session_type)
    setWorkoutTime(session.workout_time)
  }, [session])

  useEffect(() => {
    const times = Array.from({ length: 12 }, (_, i) => {
      const hour = 9 + i
      return `${hour.toString().padStart(2, '0')}:00:00`  // 초 포함
    })
    setAvailableTimes(times)
  }, [])

  useEffect(() => {
    async function fetchReservedTimes() {
      const { data, error } = await supabase
        .from('calendar_sessions')
        .select('workout_time')
        .eq('workout_date', workoutDate)
        .neq('calendar_sessions_id', session.calendar_sessions_id)
        .eq('status', '확정')
  
      if (error) {
        console.error('예약된 시간 조회 실패:', error)
        return
      }
  
      if (data) {
        const reservedSet = new Set<string>(
          data.map((d) => d.workout_time as string)
        )
        setDisabledTimes(reservedSet)
      }
    }
  
    fetchReservedTimes()
  }, [workoutDate, session.calendar_sessions_id, supabase])

  const handleTimeClick = (time: string) => {
    if (!disabledTimes.has(time)) {
      setWorkoutTime(time)
    }
  }

  const handleUpdate = async () => {
    const { data, error } = await supabase
      .from('calendar_sessions')
      .update({
        session_type: sessionType,
        workout_date: workoutDate,
        workout_time: workoutTime,
      })
      .eq('calendar_sessions_id', session.calendar_sessions_id)
      .select('calendar_sessions_id, workout_date, workout_time, session_type, member_id, status, notes, members(name)')
      .single()

    if (error || !data) {
      toast.error('수정 실패')
    } else {
      toast.success('수업이 수정되었습니다.')
    
      // 'members'가 배열일 경우 첫 번째 값으로 보정
      const fixedSession: CalendarSession = {
        ...data,
        members: Array.isArray(data.members) ? data.members[0] : data.members
      }
    
      onUpdated(fixedSession)
      onSessionChange?.()
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-black text-sm">X</button>

        <div className="text-center text-base font-medium mb-4"><strong className='text-indigo-700'>{session.members.name}</strong> 수업 수정</div>

        <div className="space-y-6">
          {/* 날짜 */}
          <div>
            <Label className="mb-2 block">날짜</Label>
            <input
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              className="border px-2 py-1 rounded text-sm w-full"
            />
          </div>

          {/* 시간 버튼 */}
          <div>
            <Label className="mb-2 block text-gray-800 font-medium text-sm">시간 선택</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {availableTimes.map((time) => (
                <div key={time} className="relative flex flex-col gap-1">
                  <Button
                    variant="outline"
                    disabled={disabledTimes.has(time)}
                    onClick={() => handleTimeClick(time)}
                    className={`
                      w-full rounded-lg py-2 text-sm font-medium
                      transition-colors duration-200
                      ${workoutTime === time ? 'bg-indigo-600 text-white font-semibold' : 'bg-white text-gray-700'}
                      ${disabledTimes.has(time) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-500 hover:text-white'}
                    `}
                  >
                    <span className="text-xs">{time.slice(0, 5)}</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* 수업 종류 라디오 */}
          <div>
            <Label className="mb-2 block">수업 종류</Label>
            <RadioGroup
              value={sessionType}
              onValueChange={setSessionType}
              options={[
                { label: 'PT', value: 'PT' },
                { label: 'GROUP', value: 'GROUP' },
                { label: 'SELF', value: 'SELF' },
              ]}
              direction="horizontal"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={onClose} variant="ghost" className="text-sm">취소</Button>
          <Button onClick={handleUpdate} variant="darkGray" className="text-sm">수정 완료</Button>
        </div>
      </div>
    </div>
  )
}

