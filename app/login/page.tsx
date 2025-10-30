'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { t, setLang, lang } = useLanguage()
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

  const nameRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)
  const adminCodeRef = useRef<HTMLInputElement | null>(null)

  // 로그인 정보 자동 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('litpt_login_info')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setName(parsed.name || '')
        setPassword(parsed.password || '')
        setRole(parsed.role || 'member')
        if (parsed.role === 'trainer') {
          setAdminCode(parsed.adminCode || '')
        }
        setSaveLoginInfo(true)
      } catch (e) {
        console.error('저장된 로그인 정보 불러오기 실패:', e)
      }
    }
  }, [])

  // 모바일 키보드 관련 처리
  useEffect(() => {
    const el = document.body
    if (!el || typeof window === 'undefined' || !('visualViewport' in window)) return

    const vv = window.visualViewport!
    const applyInset = () => {
      const bottomInset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
      el.style.paddingBottom = bottomInset > 0 ? `${bottomInset + 16}px` : '16px'
    }

    vv.addEventListener('resize', applyInset)
    vv.addEventListener('scroll', applyInset)
    applyInset()
    return () => {
      vv.removeEventListener('resize', applyInset)
      vv.removeEventListener('scroll', applyInset)
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

    const userLang = member.language || lang // 언어 설정
    setLang(userLang)

    setUser(memberWithSession)
    router.push(member.role === 'trainer' ? '/trainer' : '/my')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-100 to-white flex flex-col lg:flex-row justify-center items-center p-4">
      {/* 소개 섹션 */}
      <section className="w-full lg:w-1/2 backdrop-blur-md text-center py-8 md:py-16 mb-8 lg:mb-0">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-montserrat font-bold drop-shadow mb-4">
          <span className="text-[#FF8000]">LiT</span> <span className="text-gray-700">{t('app.title')}</span>
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-700 max-w-md mx-auto mb-8 p-6">
          {t('app.description_1')} <br /> {t('app.description_2')}
        </p>
      </section>

      {/* 로그인 카드 */}
      <section className="w-full lg:w-1/3 max-w-md bg-white shadow-xl rounded-3xl p-8 sm:p-10 flex flex-col items-center">
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
          ref={nameRef}
          type="text"
          placeholder={t('login.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="text-sm w-full border border-gray-300 p-4 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
        />
        <input
          ref={passwordRef}
          type="password"
          placeholder={t('login.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="text-sm w-full border border-gray-300 p-4 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
        />
        {role === 'trainer' && (
          <input
            ref={adminCodeRef}
            type="password"
            placeholder={t('login.adminCode')}
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="text-sm w-full border border-gray-300 p-4 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
          />
        )}

        {/* 로그인 정보 저장 */}
        <div className="flex items-center self-start mb-4">
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

        {/* 버튼 */}
        <button
          onClick={handleLogin}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition"
        >
          {t('login.button')}
        </button>

        {error && <p className="text-red-600 mt-4 text-center">{error}</p>}
      </section>
    </main>
  )
}
