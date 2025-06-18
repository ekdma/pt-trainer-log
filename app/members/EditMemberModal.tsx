'use client'

import { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { Member } from './types'

export default function EditMemberModal({
  member,
  onClose,
  onUpdate,
  supabase,
}: {
  member: Member
  onClose: () => void
  onUpdate: () => void
  supabase: SupabaseClient
}) {
  const [formData, setFormData] = useState<Member>(member)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    setErrorMsg('')
    setLoading(true)

    const { error } = await supabase
      .from('members')
      .update({
        name: formData.name,
        birth_date: formData.birth_date,
        join_date: formData.join_date,
        sex: formData.sex,
        level: formData.level,
      })
      .eq('member_id', formData.member_id)

    setLoading(false)

    if (error) {
      setErrorMsg('회원 정보 수정 중 문제가 발생했어요 😥')
    } else {
      alert('회원 정보를 성공적으로 수정했어요 ✅')
      onUpdate()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md max-h-screen overflow-auto">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">✏️ 회원 정보 수정</h2>

        {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="이름을 입력하세요"
            className="w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
          <input
            type="date"
            name="birth_date"
            value={formData.birth_date || ''}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">가입일</label>
          <input
            type="date"
            name="join_date"
            value={formData.join_date || ''}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="mb-4 flex space-x-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {/* <option value="">성별 선택</option> */}
              <option value="M">남자</option>
              <option value="F">여자</option>
            </select>
          </div>

          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <select
              name="level"
              value={formData.level}
              onChange={handleChange}
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
            {loading ? '수정 중...' : '수정'}
          </button>
        </div>
      </div>
    </div>
  )
}
