'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function Header() {
  const [memberName, setMemberName] = useState<string | null>(null)
  const pathname = usePathname()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const raw = localStorage.getItem('litpt_member')
    if (raw) {
      try {
        const user = JSON.parse(raw)
        if (user && user.name) {
          setMemberName(user.name)
        }
      } catch {}
    }
  }, [])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navItems = [
    { href: '/survey', label: '설문' },
    { href: '/packages', label: '패키지' },
    { href: '/group-sessions', label: '그룹세션' },
    { href: '/food-diary', label: '식단' },
    { href: '/workout', label: '운동' },
    { href: '/health-metric', label: '건강' },
    { href: '/goals', label: '목표설정' },
  ]

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between overflow-x-visible">
        <Link
          href="/trainer"
          className="text-xl font-bold text-rose-600 flex items-center flex-shrink-0"
        >
          <span>Lit</span>
          <span style={{ color: '#595959' }} className="ml-1">PT</span>
          {memberName && (
            <span className="text-base font-semibold text-gray-800 ml-3 whitespace-nowrap">| {memberName}</span>
          )}
        </Link>

        <nav className="flex text-sm text-gray-700 whitespace-nowrap scrollbar-hide relative z-50">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown((prev) => !prev)}
              className={`px-2 py-1 rounded-md transition ${
                pathname === '/members' || pathname === '/members-counsel'
                  ? 'bg-rose-100 text-rose-600 font-semibold'
                  : 'hover:text-rose-600'
              }`}
            >
              회원
            </button>

            {showDropdown && (
              <div className="absolute left-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-50 w-36">
                <Link
                  href="/members"
                  className={`block px-4 py-2 hover:bg-rose-50 ${
                    pathname === '/members' ? 'text-rose-600 font-semibold' : ''
                  }`}
                >
                  일반회원
                </Link>
                <Link
                  href="/members-counsel"
                  className={`block px-4 py-2 hover:bg-rose-50 ${
                    pathname === '/members-counsel' ? 'text-rose-600 font-semibold' : ''
                  }`}
                >
                  상담회원
                </Link>
              </div>
            )}
          </div>

          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 py-1 rounded-md transition ${
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

