'use client'

import { GroupSession } from '@/types/groupSessionTypes'
import dayjs from 'dayjs'
import { NotebookPen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteGroupSessionDeeply } from '@/lib/supabase'

interface Props {
  sessions: GroupSession[]
  setSessions: (sessions: GroupSession[]) => void
  fetchSessions: () => void
  setSelectedSession: (session: GroupSession) => void
  setIsEditOpen: (value: boolean) => void
}

export default function GroupSessionSearch({
  sessions,
  setSessions,
  fetchSessions,
  setSelectedSession,
  setIsEditOpen,
}: Props) {

  const handleDelete = async (sessionId: number) => {
    const password = prompt('비밀번호를 입력하세요 🤐')
    if (password !== '2213') return alert('비밀번호가 일치하지 않습니다 ❌')
    if (!confirm('정말로 이 세션을 삭제하시겠습니까?')) return

    try {
      console.log('삭제 시도 - sessionId:', sessionId)
      await deleteGroupSessionDeeply(sessionId)
      alert('세션 삭제를 완료하였습니다 🎉')
      fetchSessions()
    } catch (err: any) {
      console.error('삭제 중 오류:', err)
      alert('세션 삭제 중 문제가 발생했어요 😥\n\n' + err.message)
    }
  }

  return (
    <ul className="space-y-4 w-full max-w-3xl mx-auto">
      {sessions.map(session => (
        <li
          key={session.group_session_id}
          className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm hover:shadow-md transition duration-300 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex-1">
            <h2 className="text-gray-800 font-bold text-lg">
              {dayjs(session.group_session_date).format('YYYY.MM.DD')} - {session.theme}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              트레이너 <span className="font-medium text-gray-700">{session.trainer_name}</span> 
            </p>
            <p className="text-sm text-gray-600 mt-1">
              운동: <span className="font-medium text-gray-700">{session.workouts.join(', ')}</span> 
            </p>
            <p className="text-sm text-gray-600 mt-1">
              참여자:  <span className="font-medium text-gray-700">{session.participants.join(', ')}</span> 
            </p>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              onClick={() => {
                setSelectedSession(session)
                setIsEditOpen(true)
              }}
              variant="ghost"
              className="font-semibold bg-white border border-transparent text-indigo-700 hover:bg-indigo-300 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
              title="세션 수정"
            >
              <NotebookPen size={16} />
              수정
            </Button>

            <Button
              onClick={() => handleDelete(session.group_session_id)}
              variant="ghost"
              className="font-semibold bg-white border border-transparent text-red-600 hover:bg-red-100 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
              title="패키지 삭제"
            >
              <X size={16} />
              삭제
            </Button>
          </div>

        </li>
      ))}
    </ul>
  )
}


// 여기 삭제하는 부분을 const handleDelete = async (tag: string) => {
//   const { error } = await supabase
//     .from('food_hashtag_templates')
//     .delete()
//     .eq('trainer_id', trainerId)
//     .eq('meal_type', 'common')
//     .eq('hashtag_content', tag)

//   if (!error) {
//     onTemplateDeleted?.(tag)
//     setTagList((prev) => prev.filter((t) => t !== tag))
//   }
// } 이런 식으로 하면 안돼? 꼭 route 를 써야해? 