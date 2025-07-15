'use client'

import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { useState } from 'react'

export default function LoginPage() {
  const [name, setName] = useState('')
  const [birth, setBirth] = useState('') // YYYYMMDD
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = getSupabaseClient()

  const handleLogin = async () => {
    // YYYY-MM-DD 형태로 변환
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

    // 로그인 성공 후 role에 따라 이동
    if (member.role === 'trainer') {
      localStorage.setItem('litpt_member', JSON.stringify(member))
      router.push('/members')
    } else {
      localStorage.setItem('litpt_member', JSON.stringify(member))
      router.push('/my')
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h2 className="text-2xl font-bold mb-4 text-indigo-600">로그인</h2>
      <input
        className="border p-2 rounded mb-2 text-gray-600"
        type="text"
        placeholder="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="border p-2 rounded mb-4 text-gray-600"
        type="text"
        placeholder="생년월일 (예: 19900101)"
        value={birth}
        onChange={(e) => setBirth(e.target.value)}
      />
      <button onClick={handleLogin} className="bg-indigo-600 text-white px-4 py-2 rounded">
        로그인
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </main>
  )
}
