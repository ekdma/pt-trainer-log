'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import type { Member } from '@/components/members/types'
import { useRouter } from 'next/navigation'

const SESSION_DURATION = 30 * 60 * 1000 // 2분

interface AuthContextType {
  user: Member | null
  setUser: (user: Member | null, extend?: boolean) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<Member | null>(null)
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 자동 로그아웃
  const startLogoutTimer = (expiresAt: number) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const remain = expiresAt - Date.now()
    if (remain <= 0) return logout()
    timerRef.current = setTimeout(() => {
      logout()
      router.replace('/')
    }, remain)
  }

  const mapUserToMember = (u: any): Member => ({
    member_id: Number(u.id ?? u.member_id),
    name: u.name,
    nickname: u.nickname ?? '',
    description: u.description ?? '',
    role: u.role,
    level: u.level ?? 'Level 1',
    join_date: u.join_date ?? new Date().toISOString(),
    creation_dt: u.creation_dt ?? new Date().toISOString(),
    status: u.status ?? 'active',
    birth_date: u.birth_date ?? '',
    sex: u.sex ?? '',
    before_level: u.before_level ?? '',
    modified_dt: u.modified_dt ?? new Date().toISOString(),
    phone: u.phone ?? '',
    expiresAt: typeof u.expiresAt === 'number' ? u.expiresAt : null,
  })

  const logout = () => {
    setUserState(null)
    localStorage.removeItem('litpt_member')
    if (timerRef.current) clearTimeout(timerRef.current)
    router.replace('/')
  }

  const setUser = (u: Member | null, extend: boolean = false) => {
    if (u) {
      const member = mapUserToMember(u)
      if (extend || !member.expiresAt) {
        member.expiresAt = Date.now() + SESSION_DURATION
      }
      setUserState(member)
      localStorage.setItem('litpt_member', JSON.stringify(member))
      startLogoutTimer(member.expiresAt)
    } else {
      logout()
    }
  }

  // 초기 로컬스토리지 불러오기
  useEffect(() => {
    const raw = localStorage.getItem('litpt_member')
    if (raw) {
      const parsed = mapUserToMember(JSON.parse(raw))
      if (!parsed.expiresAt || Date.now() > parsed.expiresAt) {
        logout()
      } else {
        setUserState(parsed)
        startLogoutTimer(parsed.expiresAt)
      }
    }
  }, [])

  // 사용자 활동 감지 -> 세션 연장
  useEffect(() => {
    let throttleTimer: NodeJS.Timeout | null = null
    const extendSession = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        if (user) setUser(user, true) // expiresAt 갱신 + 타이머 재설정
        throttleTimer = null
      }, 500)
    }

    const events = ['keydown', 'scroll', 'mousedown', 'touchstart']
    events.forEach((e) => window.addEventListener(e, extendSession))
    return () => events.forEach((e) => window.removeEventListener(e, extendSession))
  }, [user])

  return <AuthContext.Provider value={{ user, setUser, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
