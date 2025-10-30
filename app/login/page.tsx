'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = () => {
    // 로그인 처리 로직 추가
    console.log('로그인 시도:', { name, password })
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start pt-16 px-4">
      <section className="w-full max-w-sm bg-white shadow-lg rounded-xl p-8">
        <h2 className="text-2xl font-bold text-center text-indigo-700 mb-6">로그인</h2>

        {/* 아이디 입력 칸 */}
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">아이디</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="아이디를 입력하세요"
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 비밀번호 입력 칸 */}
        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">비밀번호</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 로그인 버튼 */}
        <button
          onClick={handleLogin}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
        >
          로그인
        </button>
      </section>
    </div>
  )
}
