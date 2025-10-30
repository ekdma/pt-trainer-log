'use client'
import { useLanguage } from '@/context/LanguageContext'
import { useState } from 'react'

export default function LoginPage() {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = () => {
    // 로그인 처리 로직 추가
    console.log('로그인 시도:', { name, password })
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      
      {/* 소개 섹션: app.title과 app.description 추가 */}
      <section className="w-full backdrop-blur-md text-center py-8 md:py-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-montserrat font-bold drop-shadow mb-4">
          <span className="text-[#FF8000]">LiT</span> <span className="text-gray-700">{t('app.title')}</span>
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-700 max-w-md mx-auto mb-8 p-6">
          {t('app.description')}
        </p>
      </section>

      {/* 로그인 섹션 */}
      <section className="w-full max-w-sm bg-white shadow-lg rounded-xl p-8 mx-auto mt-8">
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
