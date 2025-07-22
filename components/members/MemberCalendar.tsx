'use client'

import { X, Eye, EyeClosed as EyeClosedIcon } from "lucide-react"
import { Calendar } from "react-calendar"
import dayjs from "dayjs"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/solid'

interface MemberCalendarProps {
  member: { member_id: number; name: string }
  sessionDates: Record<string, { pt: string[]; group: string[]; self: string[] }>
  showSessionList: boolean
  setShowSessionList: (show: boolean) => void
  onClose: () => void
}

export default function MemberCalendar({
  member,
  sessionDates,
  showSessionList,
  setShowSessionList,
  onClose,
}: MemberCalendarProps) {
  const memberSessions = sessionDates[member.member_id] || {}

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex justify-center items-center">
      <div className="bg-white rounded-xl p-6 shadow-lg max-w-md w-full relative">
        {/* 닫기 버튼 */}
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-black transition"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        {/* 헤더 */}
        <div className="flex justify-center items-center mb-4 space-x-4">
          <h3 className="text-lg font-semibold text-gray-700">
            {member.name}님의 세션 일정
          </h3>

          <button
            onClick={() => setShowSessionList(!showSessionList)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 transition"
          >
            {showSessionList ? (
              <>
                <EyeClosedIcon className="w-4 h-4" />
                세션 닫기
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                세션 보기
              </>
            )}
          </button>
        </div>

        {/* 캘린더 */}
        <Calendar
          className="mx-auto"
          prev2Label={<ChevronDoubleLeftIcon className="w-4 h-4 text-gray-500 hover:text-blue-500" />}
          prevLabel={<ChevronLeftIcon className="w-4 h-4 text-gray-600 hover:text-blue-500" />}
          nextLabel={<ChevronRightIcon className="w-4 h-4 text-gray-600 hover:text-blue-500" />}
          next2Label={<ChevronDoubleRightIcon className="w-4 h-4 text-gray-500 hover:text-blue-500" />}
          tileClassName={({ date }) => {
            const d = dayjs(date).format('YYYY-MM-DD')
            if (memberSessions.pt?.includes(d)) return 'pt-session'
            if (memberSessions.group?.includes(d)) return 'group-session'
            if (memberSessions.self?.includes(d)) return 'self-session'
            return ''
          }}
        />

        {/* 세션 리스트 */}
        {showSessionList && (
          <div className="mt-4 space-y-3 text-sm flex flex-col items-center max-h-[200px] overflow-y-auto">
            {['pt', 'group', 'self'].map((type) =>
              memberSessions[type as keyof typeof memberSessions]
                ?.slice()
                .sort((a, b) => dayjs(a).unix() - dayjs(b).unix())
                .map((date) => (
                  <div key={`${type}-${date}`} className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        type === 'pt'
                          ? 'text-blue-700 bg-blue-100'
                          : type === 'group'
                          ? 'text-purple-700 bg-purple-100'
                          : 'text-gray-700 bg-gray-200'
                      }`}
                    >
                      {type.toUpperCase()}
                    </span>
                    <span className="text-gray-800">
                      {dayjs(date).format('YYYY.MM.DD')} ({'일월화수목금토'[dayjs(date).day()]})
                    </span>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
