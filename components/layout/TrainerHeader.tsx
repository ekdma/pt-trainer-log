'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Header() {
  const [memberName, setMemberName] = useState<string | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('litpt_member')
    if (raw) {
      try {
        const user = JSON.parse(raw)
        if (user && user.name) {
          setMemberName(user.name)
        }
      } catch {
        // JSON parsing 실패 시 무시
      }
    }
  }, [])

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/trainer" className="text-xl font-bold text-rose-600 flex items-center">
          <span>Lit</span>
          <span style={{ color: '#595959' }} className="ml-1">PT</span>
          {memberName && (
            <span className="text-base font-semibold text-gray-800 ml-3">| {memberName}</span>
          )}
        </Link>
        <nav className="flex gap-6 text-sm text-gray-700">
          <Link href="/members" className="hover:text-rose-600">회원</Link>
          <Link href="/packages" className="hover:text-rose-600">패키지</Link>
          <Link href="/group-sessions" className="hover:text-rose-600">그룹세션</Link>
          <Link href="/food-diary" className="hover:text-rose-600">식단</Link>
          <Link href="/workout" className="hover:text-rose-600">운동</Link>
          <Link href="/health-metric" className="hover:text-rose-600">건강</Link>
          <Link href="/goals" className="hover:text-rose-600">목표설정</Link>
        </nav>
      </div>
    </header>
  )
}
