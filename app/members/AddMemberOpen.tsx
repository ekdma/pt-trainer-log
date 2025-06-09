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
  const [birthInput, setBirthInput] = useState('')
  const [sex, setSex] = useState('성별') // ✅ default option
  const [role, setRole] = useState('MEMBER')
  const [joinDate, setJoinDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async () => {
    setErrorMsg('')

    if (!name.trim()) {
      setErrorMsg('이름을 입력하세요')
      return
    }

    if (!birthInput.trim()) {
      setErrorMsg('생년월일 또는 출생연도를 입력하세요')
      return
    }

    if (sex === '성별') {
      setErrorMsg('성별을 선택하세요')
      return
    }

    let birthDate: string

    if (/^\d{4}$/.test(birthInput)) {
      birthDate = `${birthInput}-01-01`
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(birthInput)) {
      birthDate = birthInput
    } else {
      setErrorMsg('생일 형식이 올바르지 않습니다 (예: 1995 또는 1995-07-03)')
      return
    }

    setLoading(true)

    const { error } = await supabase.from('members').insert([
      {
        name,
        birth_date: birthDate,
        sex,
        role,
        join_date: joinDate,
      },
    ])

    setLoading(false)

    if (error) {
      setErrorMsg(error.message)
      alert('회원 추가 중 문제가 발생했어요 😥')
    } else {
      alert('회원 추가를 완료하였습니다 😊')
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
          <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
          <input
            type="text"
            value={birthInput}
            onChange={(e) => setBirthInput(e.target.value)}
            placeholder="예: 1995 또는 1995-07-03"
            className="w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            ※ 연도만 입력 시 &#39;01-01&#39;로 자동 처리됩니다
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            className="w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="성별" disabled>성별</option>
            <option value="M">남자</option>
            <option value="F">여자</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="MEMBER">회원</option>
            <option value="TRAINER">트레이너</option>
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
