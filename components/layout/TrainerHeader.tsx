'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function Header() {
  const [memberName, setMemberName] = useState<string | null>(null)
  const pathname = usePathname()

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

  const navItems = [
    { href: '/members', label: '회원' },
    { href: '/packages', label: '패키지' },
    { href: '/group-sessions', label: '그룹세션' },
    { href: '/food-diary', label: '식단' },
    { href: '/workout', label: '운동' },
    { href: '/health-metric', label: '건강' },
    { href: '/goals', label: '목표설정' },
  ]

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
        <nav className="flex gap-2 text-sm text-gray-700">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1 rounded-md transition ${
                  isActive
                    ? 'bg-rose-100 text-rose-600 font-semibold'
                    : 'hover:text-rose-600'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
