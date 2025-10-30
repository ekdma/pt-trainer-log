'use client'
import { useState, useEffect, useRef } from 'react'
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

  const nameRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)
  const adminCodeRef = useRef<HTMLInputElement | null>(null)

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

  // Disable auto-scroll when input is focused and adjust scroll position
  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      const input = event.target as HTMLInputElement
      const rect = input.getBoundingClientRect()

      // Check if the input is too close to the bottom
      if (rect.bottom > window.innerHeight - 100) {
        window.scrollTo(0, window.scrollY + rect.bottom - window.innerHeight + 100)
      }
    }

    // Adding focus event listener to inputs
    const inputs = document.querySelectorAll('input')
    inputs.forEach(input => input.addEventListener('focus', handleFocus))

    return () => {
      inputs.forEach(input => input.removeEventListener('focus', handleFocus))
    }
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-100 to-white flex justify-center items-center p-4">
      <section className="w-full max-w-xs sm:max-w-sm bg-white shadow-lg rounded-3xl p-6 sm:p-8 flex flex-col items-center">
        <div className="mb-4">
          <LanguageToggle />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 text-center mb-6">
          {t('login.title')}
        </h2>

        <div className="flex justify-center gap-4 mb-6">
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

        <input
          ref={nameRef}
          type="text"
          placeholder={t('login.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="text-sm w-full border border-gray-300 p-3 rounded-lg mb-4"
        />
        <input
          ref={passwordRef}
          type="password"
          placeholder={t('login.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="text-sm w-full border border-gray-300 p-3 rounded-lg mb-4"
        />
        {role === 'trainer' && (
          <input
            ref={adminCodeRef}
            type="password"
            placeholder={t('login.adminCode')}
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="text-sm w-full border border-gray-300 p-3 rounded-lg mb-4"
          />
        )}

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
