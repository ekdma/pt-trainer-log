'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react' // 아이콘 사용
import LanguageToggle from '@/components/LanguageToggle'  // 추가

export default function Header() {
  const [memberName, setMemberName] = useState<string | null>(null)
  const pathname = usePathname()
  const [showDropdown, setShowDropdown] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
    { href: '/calendar', label: '일정' },
    { href: '/survey', label: '설문' },
    { href: '/packages', label: '패키지' },
    { href: '/group-sessions', label: '그룹세션' },
    { href: '/food-diary', label: '식단' },
    { href: '/workout', label: '운동' },
    { href: '/health-metric', label: '건강' },
    { href: '/goals', label: '목표설정' },
    { href: '/before-after', label: '비포애프터' },
  ]

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-10 w-full">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo & Name */}
        <Link
          href="/trainer"
          className="text-xl font-bold text-rose-600 flex items-center"
        >
          <span>LiT</span>
          <span style={{ color: '#595959' }} className="ml-1">PT</span>
          {memberName && (
            <span className="text-base font-semibold text-gray-800 ml-3 whitespace-nowrap">
              | {memberName}
            </span>
          )}
        </Link>

        {/* Desktop Nav + Language Toggle */}
        <nav className="hidden sm:flex gap-2 items-center text-sm text-gray-700">
          {/* 회원 드롭다운 */}
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

          {/* Language Toggle 추가 */}
          <div className="ml-4">
            <LanguageToggle />
          </div>
        </nav>

        {/* Mobile Hamburger Button + Language Toggle */}
        <div className="sm:hidden flex items-center gap-2">
          <LanguageToggle />
          <button
            className="p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div
          className={`fixed inset-0 z-70 bg-white flex flex-col px-6 py-8 sm:hidden overflow-y-auto transform transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
          }`}
        >
          {/* 상단 닫기 버튼 */}
          <div className="flex justify-end mb-6">
            <button onClick={() => setMobileMenuOpen(false)}>
              <X size={28} />
            </button>
          </div>

          {/* 메뉴 항목들 */}
          <div className="flex flex-col gap-3 text-sm font-medium text-gray-800">
            <Link
              href="/members"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-2 py-2 rounded-md transition active:scale-95 active:bg-gray-200 ${
                pathname === '/members'
                  ? 'bg-rose-100 text-rose-600 font-semibold'
                  : 'hover:bg-gray-100'
              }`}
            >
              일반회원
            </Link>
            <Link
              href="/members-counsel"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-2 py-2 rounded-md transition active:scale-95 active:bg-gray-200 ${
                pathname === '/members-counsel'
                  ? 'bg-rose-100 text-rose-600 font-semibold'
                  : 'hover:bg-gray-100'
              }`}
            >
              상담회원
            </Link>
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-2 py-2 rounded-md transition active:scale-95 active:bg-gray-200 ${
                    isActive
                      ? 'bg-rose-100 text-rose-600 font-semibold'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}
