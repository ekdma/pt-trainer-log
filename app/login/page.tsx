'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'member' | 'trainer'>('member')
  const [adminCode, setAdminCode] = useState('')
  const [saveLoginInfo, setSaveLoginInfo] = useState(false)  
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = getSupabaseClient()
  const { setUser } = useAuth()

  const SESSION_DURATION = 30 * 60 * 1000 // 2분
  const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE || 'secret123'

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
        setSaveLoginInfo(true) // ✅ 저장된 게 있으면 체크박스 켜기
      } catch (e) {
        console.error('저장된 로그인 정보 불러오기 실패:', e)
      }
    }
  }, [])

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
    setUser(memberWithSession)
    router.push(member.role === 'trainer' ? '/trainer' : '/my')
  }

  // 이 부분에서 FoodDiaryTrainerView 방식에 맞추어 화면의 스크롤을 제어합니다.
  const handleFocus = () => {
    // 화면의 스크롤을 잠그고, 포커스된 필드를 상단에 고정
    document.body.style.overflow = 'hidden'; // 스크롤 방지
  };

  const handleBlur = () => {
    // 포커스를 잃었을 때 스크롤 복원
    document.body.style.overflow = '';
  };

  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-gradient-to-br from-indigo-100 to-white">
      {/* 소개 섹션 */}
      <section className="flex flex-col justify-center items-center p-8 md:p-16 text-center md:text-left bg-white/30 backdrop-blur-md">
        <h1 className="text-center text-3xl sm:text-4xl md:text-5xl font-montserrat font-bold drop-shadow mb-4 leading-tight">
          <span className="text-[#FF8000]">LiT</span>{' '}
          <span className="text-[#595959]">{t('app.title')}</span>
        </h1>
        <p className="text-center text-sm sm:text-base md:text-lg text-gray-700 max-w-md leading-relaxed whitespace-pre-line">
          {t('app.description_1')} <br /> {t('app.description_2')}
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
            onFocus={handleFocus} // 포커스 시 스크롤 방지
            onBlur={handleBlur}   // 포커스 잃으면 스크롤 복원
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="text-sm w-full border border-gray-300 p-3 rounded-lg mb-4"
          />
          <input
            type="password"
            placeholder={t('login.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={handleFocus} // 포커스 시 스크롤 방지
            onBlur={handleBlur}   // 포커스 잃으면 스크롤 복원
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="text-sm w-full border border-gray-300 p-3 rounded-lg mb-4"
          />
          {role === 'trainer' && (
            <input
              type="password"
              placeholder={t('login.adminCode')}
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              onFocus={handleFocus} // 포커스 시 스크롤 방지
              onBlur={handleBlur}   // 포커스 잃으면 스크롤 복원
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

          {/* 로그인 버튼 */}
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
