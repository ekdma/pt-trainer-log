'use client'

import { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'

type Props = {
  onClose: () => void
  onMemberAdded: () => void
}

export default function AddMemberOpen({ onClose, onMemberAdded }: Props) {
  const supabase: SupabaseClient = getSupabaseClient()

  const [name, setName] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [role, setRole] = useState('member')
  const [joinDate, setJoinDate] = useState<string>(() => {
    // 기본값: 오늘 날짜 (YYYY-MM-DD)
    const today = new Date().toISOString().slice(0, 10)
    return today
  })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async () => {
    setErrorMsg('')
    if (!name.trim()) {
      setErrorMsg('이름을 입력하세요')
      return
    }
    if (age === '' || age <= 0) {
      setErrorMsg('나이를 올바르게 입력하세요')
      return
    }

    setLoading(true)
    // member_id는 자동증가, creation_dt는 DB에서 기본값으로 자동 입력하도록 하자 (DB 설정 필요)
    const { error } = await supabase.from('members').insert([
      {
        name,
        age,
        role,
        join_date: joinDate,
        // creation_dt는 DB에서 자동입력이라서 여기선 안 넣음
      },
    ])

    setLoading(false)
    if (error) {
      setErrorMsg(error.message)
    } else {
      // 등록 성공 후 닫고, 부모가 목록 갱신하도록 콜백 호출
      onMemberAdded()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md max-h-screen overflow-auto">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">🏃‍♂️ 신규 회원 등록</h2>

            {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}

            <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            </div>

            <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">나이</label>
            <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                min={1}
                placeholder="예: 29"
            />
            </div>

            <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
            <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
                <option value="member">회원</option>
                <option value="trainer">트레이너</option>
            </select>
            </div>

            <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">가입일</label>
            <input
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                className="w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            </div>

            <div className="flex justify-end space-x-3">
            <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 transition"
            >
                취소
            </button>
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded transition"
            >
                {loading ? '등록 중...' : '등록'}
            </button>
            </div>
        </div>
        </div>
  )
}
