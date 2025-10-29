'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { t, lang, setLang } = useLanguage()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'member' | 'trainer'>('member')
  const [adminCode, setAdminCode] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = getSupabaseClient()
  const { setUser } = useAuth()

  const SESSION_DURATION = 30 * 60 * 1000 // 30분

  const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE || 'secret123'

  const handleLogin = async () => {
    setError('')
    const inputName = name.trim().toLowerCase()

    if (role === 'trainer' && adminCode !== ADMIN_CODE) {
      setError(t('login.wrongAdmin'))
      return
    }

    let { data: member, error } = await supabase
      .from('members')
      .select('*')
      .ilike('nickname', inputName)
      .eq('role', role)
      .eq('status', 'active')
      .single()

    let loginBy = 'nickname'

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
      setError(t('login.noMatch'))
      return
    }

    const phoneLast4 = (member.phone || '').slice(-4)
    if (password !== phoneLast4) {
      setError(t('login.wrongPassword'))
      return
    }

    const expiresAt = Date.now() + SESSION_DURATION
    const memberWithSession = { ...member, loginBy, expiresAt }

    console.log('Current selected language before login:', lang)

    // 언어 상태 업데이트
    document.cookie = `litpt_lang=${lang}; path=/; max-age=31536000; samesite=lax`
    localStorage.setItem('litpt_lang', lang)

    // 언어 변경 이벤트 발생
    window.dispatchEvent(new Event('language-change'))

    // 사용자 세션 설정 및 페이지 이동
    setUser(memberWithSession)
    router.push(member.role === 'trainer' ? '/trainer' : '/my')
  }


  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-gradient-to-br from-indigo-100 to-white">
      {/* 소개 섹션 */}
      <section className="flex flex-col justify-center items-center p-8 md:p-16 text-center md:text-left bg-white/30 backdrop-blur-md">
        <h1 className="text-center text-3xl sm:text-4xl md:text-5xl font-montserrat font-bold drop-shadow mb-4 leading-tight">
          <span className="text-[#FF8000]">LiT</span>{' '}
          <span className="text-[#595959]">{t('app.title')}</span>
        </h1>
        <p className="text-center text-sm sm:text-base md:text-lg text-gray-700 max-w-md leading-relaxed whitespace-pre-line">
          {t('app.description')}
        </p>
      </section>

      {/* 로그인 카드 */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl p-8 sm:p-10 flex flex-col items-center">
            {/* LanguageToggle 위쪽 중앙 정렬 */}
            <div className="mb-6">
            <LanguageToggle />
            </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 text-center mb-8">
            {t('login.title')}
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
              <span className="ml-2 text-gray-700 font-semibold">{t('login.member')}</span>
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
              <span className="ml-2 text-gray-700 font-semibold">{t('login.coach')}</span>
            </label>
          </div>

          {/* 입력 필드 */}
          <input
            type="text"
            placeholder={t('login.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="text-sm w-full border border-gray-300 p-3 rounded-lg mb-4"
          />
          <input
            type="password"
            placeholder={t('login.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="text-sm w-full border border-gray-300 p-3 rounded-lg mb-4"
          />
          {role === 'trainer' && (
            <input
              type="password"
              placeholder={t('login.adminCode')}
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="text-sm w-full border border-gray-300 p-3 rounded-lg mb-4"
            />
          )}

          {/* 버튼 */}
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition"
          >
            {t('login.button')}
          </button>

          {error && <p className="text-red-600 mt-4 text-center">{error}</p>}
        </div>
      </section>
    </main>
  )
}