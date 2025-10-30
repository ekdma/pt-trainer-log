'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { t, setLang } = useLanguage()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'member' | 'trainer'>('member')
  const [adminCode, setAdminCode] = useState('')
  const [saveLoginInfo, setSaveLoginInfo] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const supabase = getSupabaseClient()
  const { setUser } = useAuth()

  const SESSION_DURATION = 30 * 60 * 1000
  const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE || 'secret123'

  // 화면 스크롤을 막고 입력 필드가 화면에 잘 보이도록 처리
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const onVVChange = () => {
      const vv = (window).visualViewport
      const root = rootRef.current
      if (!vv || !root) return
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      root.style.setProperty('--kb', `${kb}px`) // 하단 패딩으로 사용
    }
    ;(window).visualViewport?.addEventListener('resize', onVVChange)
    ;(window).visualViewport?.addEventListener('scroll', onVVChange)
    onVVChange()
    return () => {
      ;(window).visualViewport?.removeEventListener('resize', onVVChange)
      ;(window).visualViewport?.removeEventListener('scroll', onVVChange)
    }
  }, [])

  // 로그인 처리
  const handleLogin = async () => {
    setError('')
    const inputName = name.trim().toLowerCase()

    if (role === 'trainer' && adminCode !== ADMIN_CODE) {
      setError(t('login.wrongAdmin'))
      return
    }

    setUser(null)

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

    if (saveLoginInfo) {
      localStorage.setItem(
        'litpt_login_info',
        JSON.stringify({ name, password, role, adminCode: role === 'trainer' ? adminCode : undefined })
      )
    } else {
      localStorage.removeItem('litpt_login_info')
    }

    const expiresAt = Date.now() + SESSION_DURATION
    const memberWithSession = { ...member, loginBy, expiresAt }
    const userLang = member.language || 'ko'
    setLang(userLang)

    setUser(memberWithSession)
    router.push(member.role === 'trainer' ? '/trainer' : '/my')
  }

  return (
    <div
      ref={rootRef}
      className="min-h-[100dvh] bg-gradient-to-br from-indigo-100 to-white overflow-y-auto px-4"
      style={{ paddingBottom: 'var(--kb, 0px)' }} // 키보드 높이만큼 여유
    >
      {/* 상단 간격(푸시) → 중앙정렬 대신 자연스런 위여백 */}
      <div className="h-6" />

      <section className="w-full max-w-xs sm:max-w-sm mx-auto bg-white shadow-lg rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex justify-center">
          <LanguageToggle />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 text-center">
          {t('login.title')}
        </h2>

        {/* 역할 선택 */}
        <div className="flex justify-center gap-6">
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

        {/* ✅ FoodDiary 스타일의 카드형 input들 */}
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-inner hover:shadow-md transition-all duration-300">
            <label className="block text-xs font-semibold text-gray-600 mb-1">👤 {t('login.name')}</label>
            <input
              type="text"
              inputMode="text"
              value={name}
              onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-300 transition text-gray-800"
              placeholder={t('login.name')}
            />
          </div>

          <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-inner hover:shadow-md transition-all duration-300">
            <label className="block text-xs font-semibold text-gray-600 mb-1">🔑 {t('login.password')}</label>
            <input
              type="password"
              inputMode="text"
              value={password}
              onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-300 transition text-gray-800"
              placeholder={t('login.password')}
            />
          </div>

          {role === 'trainer' && (
            <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-inner hover:shadow-md transition-all duration-300">
              <label className="block text-xs font-semibold text-gray-600 mb-1">🧾 {t('login.adminCode')}</label>
              <input
                type="password"
                inputMode="text"
                value={adminCode}
                onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                onChange={(e) => setAdminCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-300 transition text-gray-800"
                placeholder={t('login.adminCode')}
              />
            </div>
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="saveLogin"
            checked={saveLoginInfo}
            onChange={(e) => setSaveLoginInfo(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="saveLogin" className="text-sm text-gray-700">
            {t('login.saveInfo')}
          </label>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition"
        >
          {t('login.button')}
        </button>

        {error && <p className="text-red-600 text-center">{error}</p>}
      </section>

      {/* 아래 여백: 키보드 없을 때도 살짝 여유 */}
      <div className="h-10" />
    </div>
  )
}
