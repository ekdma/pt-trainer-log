'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, setUser, logout } = useAuth()
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userRef = useRef(user)

  // user 상태 Ref 업데이트
  useEffect(() => { userRef.current = user }, [user])

  // 로그아웃 및 / 리다이렉트
  const logoutAndRedirect = () => {
    logout()
    setTimeout(() => router.replace('/'), 0) // 상태 업데이트 후 안전하게 redirect
  }

  // 타이머 초기화 + 시작
  const clearTimer = () => { if (timerRef.current) clearTimeout(timerRef.current) }

  const startLogoutTimer = () => {
    clearTimer()
    const currentUser = userRef.current
    if (!currentUser?.expiresAt) return
    const remain = currentUser.expiresAt - Date.now()
    if (remain <= 0) return logoutAndRedirect()
    timerRef.current = setTimeout(logoutAndRedirect, remain)
  }

  // 초기 mount 시와 user 변경 시 타이머 시작
  useEffect(() => {
    if (user) startLogoutTimer()
    return () => clearTimer()
  }, [user])

  // 사용자 활동 감지 시 세션 연장
  useEffect(() => {
    let throttleTimer: NodeJS.Timeout | null = null
    const extendSession = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        const currentUser = userRef.current
        if (currentUser) {
          setUser(currentUser, true)  // expiresAt 갱신
          startLogoutTimer()          // 타이머 재설정
        } else {
          logoutAndRedirect() // ✅ 세션 없으면 강제 로그아웃
        }
        throttleTimer = null
      }, 500) // 0.5초 제한
    }

    const events = ['keydown', 'scroll', 'mousedown', 'touchstart']
    events.forEach(e => window.addEventListener(e, extendSession))
    return () => events.forEach(e => window.removeEventListener(e, extendSession))
  }, [setUser])

  return <>{children}</>
}
