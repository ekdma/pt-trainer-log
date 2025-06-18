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
  const [sex, setSex] = useState('F') // ✅ default option
  const [level, setLevel] = useState('Level 1')
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

    // if (sex === '성별') {
    //   setErrorMsg('성별을 선택하세요')
    //   return
    // }

    let birthDate: string

    if (/^\d{4}$/.test(birthInput)) {
      // 4자리: 연도만 입력한 경우
      birthDate = `${birthInput}-01-01`
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(birthInput)) {
      // yyyy-mm-dd 형식
      birthDate = birthInput
    } else if (/^\d{8}$/.test(birthInput)) {
      // 8자리 숫자 (yyyyMMdd)
      const year = birthInput.slice(0, 4)
      const month = birthInput.slice(4, 6)
      const day = birthInput.slice(6, 8)
    
      // 유효한 날짜인지 간단한 검증 추가 (선택 사항)
      if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
        birthDate = `${year}-${month}-${day}`
      } else {
        setErrorMsg('생일 형식이 올바르지 않습니다 (예: 1995, 1995-07-03, 또는 19950703)')
        return
      }
    } else {
      setErrorMsg('생일 형식이 올바르지 않습니다 (예: 1995, 1995-07-03, 또는 19950703)')
      return
    }

    setLoading(true)

    const { error } = await supabase.from('members').insert([
      {
        name,
        birth_date: birthDate,
        sex,
        level,
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
            placeholder="예: 1995 또는 19950703"
            className="w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            ※ 연도만 입력 시 &#39;01-01&#39;로 자동 처리됩니다
          </p>
        </div>

        <div className="mb-4 flex space-x-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {/* <option value="성별" disabled>성별</option> */}
              <option value="F">여자</option>
              <option value="M">남자</option>
            </select>
          </div>

          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="Level 1">Level 1</option>
              <option value="Level 2">Level 2</option>
              <option value="Level 3">Level 3</option>
              <option value="Level 4">Level 4</option>
              <option value="Level 5">Level 5</option>
            </select>
          </div>
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
