'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function Header() {
  const [memberName, setMemberName] = useState<string | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('litpt_member') || '{}')
    const displayName = user.nickname || user.name

    const raw = localStorage.getItem('litpt_member')
    if (raw) {
      try {
        const user = JSON.parse(raw)
        if (user && displayName) {
          setMemberName(displayName)
        }
      } catch {
        // JSON parsing 실패 시 무시
      }
    }
  }, [])

  const navItems = [
    { href: '/food-diary', label: '식단' },
    { href: '/workout', label: '운동' },
    { href: '/health-metric', label: '건강' },
    { href: '/goals', label: '목표설정' },
  ]

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between whitespace-nowrap overflow-hidden">
        {/* 왼쪽 로고 */}
        <Link
          href="/my"
          className="text-xl font-bold text-rose-600 flex items-center min-w-0"
        >
          <span className="shrink-0">Lit</span>
          <span style={{ color: '#595959' }} className="ml-1 shrink-0">
            PT
          </span>
          {memberName && (
            <span
              className="text-sm sm:text-base font-medium text-gray-800 ml-3 truncate"
              title={memberName}
            >
              | {memberName}
            </span>
          )}
        </Link>

        {/* 우측 메뉴 */}
        <nav className="flex gap-1 text-xs sm:text-sm text-gray-700 shrink-0">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 sm:px-3 py-1 rounded-md transition ${
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

