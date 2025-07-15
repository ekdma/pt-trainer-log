'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

export default function Home() {
  const [name, setName] = useState('')
  const [birth, setBirth] = useState('') // YYYYMMDD
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = getSupabaseClient()

  const handleLogin = async () => {
    const birthDate = `${birth.slice(0, 4)}-${birth.slice(4, 6)}-${birth.slice(6, 8)}`
    
    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('name', name)
      .eq('birth_date', birthDate)
      .single()

    if (error || !member) {
      setError('이름과 생년월일이 일치하는 회원이 없습니다.')
      return
    }

    localStorage.setItem('litpt_member', JSON.stringify(member))
    if (member.role === 'trainer') {
      router.push('/members')
    } else {
      router.push('/my')
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <h1 className="text-4xl font-bold mb-6 text-center text-indigo-600">LIT PT Training Log</h1>
      <p className="text-lg text-gray-500 mb-8 text-center">
        LIT PT 회원의 운동 데이터를 기록하고 시각화하여 건강한 피트니스 라이프를 돕는 시스템입니다🙌
      </p>

      {/* 로그인 박스 */}
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-xl font-semibold text-indigo-600 mb-4 text-center">로그인</h2>
        <input
          className="w-full border p-2 rounded mb-2 text-gray-600"
          type="text"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded mb-4 text-gray-600"
          type="text"
          placeholder="생년월일 (예: 19900101)"
          value={birth}
          onChange={(e) => setBirth(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
        >
          로그인
        </button>
        {error && <p className="text-red-500 mt-2 text-sm text-center">{error}</p>}
      </div>
    </main>
  )
}
