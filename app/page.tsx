'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
// import Image from 'next/image'

export default function Home() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('') 
  const [role, setRole] = useState<'member' | 'trainer'>('member')
  const [adminCode, setAdminCode] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = getSupabaseClient()

  const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE || 'secret123'

  const handleLogin = async () => {
    setError('')
  
    const inputName = name.trim().toLowerCase()

    if (role === 'trainer' && adminCode !== ADMIN_CODE) {
      setError('관리자 코드를 올바르게 입력해주세요 😁')
      return
    }
  
    // nickname을 우선 시도
    let { data: member, error } = await supabase
      .from('members')
      .select('*')
      .ilike('nickname', inputName)
      .eq('role', role)
      .eq('status', 'active')
      .single()
  
    let loginBy = 'nickname'
  
    // nickname이 없거나 nickname으로 로그인 실패 → name으로 재시도
    if (error || !member) {
      const res = await supabase
        .from('members')
        .select('*')
        .ilike('name', inputName)
        .eq('role', role)
        .eq('status', 'active')
        .single()
  
      member = res.data
      error = res.error
      loginBy = 'name'
    }
  
    if (error || !member) {
      setError('일치하는 회원이 없습니다 😥')
      return
    }
  
    // 전화번호 끝 4자리 검사
    const phoneLast4 = (member.phone || '').slice(-4)
    if (password !== phoneLast4) {
      setError('비밀번호가 올바르지 않습니다.')
      return
    }
  
    // ✅ 로그인 식별자도 함께 저장 (선택적)
    const memberWithLoginBy = {
      ...member,
      loginBy, // 'nickname' 또는 'name'
    }
  
    localStorage.setItem('litpt_member', JSON.stringify(memberWithLoginBy))
    router.push(member.role === 'trainer' ? '/trainer' : '/my')
  }

  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-gradient-to-br from-indigo-100 to-white">
      {/* 소개 카드 */}
      <section className="flex flex-col justify-center items-center p-8 md:p-16 text-center md:text-left bg-white/30 backdrop-blur-md">
        {/* <Image
          src="/logo.png"
          alt="LIT PT Logo"
          width={150}
          height={150}
          priority
          className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 mb-6"
        /> */}
        <h1 className="text-center text-3xl sm:text-4xl md:text-5xl font-montserrat font-bold drop-shadow mb-4 leading-tight">
          <span className="text-[#FF6600]">LiT</span>{' '}
          <span className="text-[#595959]">Personal Training Log</span>
        </h1>

        <p className="text-center text-sm sm:text-base md:text-lg text-gray-700 max-w-md leading-relaxed">
          LiT PT 회원의 운동 데이터를 기록하고 시각화하여 <br />
          건강한 피트니스 라이프를 돕는 시스템입니다 🙌
        </p>
      </section>

      {/* 로그인 카드 */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl p-8 sm:p-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 text-center mb-8">
            로그인
          </h2>

          {/* 역할 선택 */}
          <div className="flex justify-center gap-6 text-sm sm:text-base mb-6">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="radio"
                name="role"
                value="member"
                checked={role === 'member'}
                onChange={() => setRole('member')}
                className="form-radio text-indigo-600"
              />
              <span className="ml-2 text-gray-700 font-semibold">회원</span>
            </label>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="radio"
                name="role"
                value="trainer"
                checked={role === 'trainer'}
                onChange={() => setRole('trainer')}
                className="form-radio text-indigo-600"
              />
              <span className="ml-2 text-gray-700 font-semibold">트레이너</span>
            </label>
          </div>

          {/* 입력 필드 */}
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full border border-gray-300 p-3 rounded-lg mb-4 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
          <input
            type="password"
            placeholder="비밀번호 (전화번호 끝 4자리)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full border border-gray-300 p-3 rounded-lg mb-4 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
          {role === 'trainer' && (
            <input
              type="password"
              placeholder="관리자 코드 입력"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full border border-gray-300 p-3 rounded-lg mb-4 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          )}

          {/* 버튼 */}
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition flex justify-center items-center gap-2"
          >
            로그인
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-red-600 mt-4 text-center font-medium text-sm">{error}</p>
          )}
        </div>
      </section>
    </main>
  )
}
