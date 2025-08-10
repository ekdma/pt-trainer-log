'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import LanguageToggle from '@/components/LanguageToggle'
import { useLanguage } from '@/context/LanguageContext'

export default function Header() {
  const [memberName, setMemberName] = useState<string | null>(null)
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { t } = useLanguage()  // 번역 함수 가져오기

  useEffect(() => {
    const raw = localStorage.getItem('litpt_member')
    if (raw) {
      try {
        const user = JSON.parse(raw)
        const displayName = user.nickname || user.name
        if (user && displayName) {
          setMemberName(displayName)
        }
      } catch {
        // 무시
      }
    }
  }, [])

  const navItems = [
    { href: '/my-calendar', label: t('header.schedule') },
    { href: '/food-diary', label: t('header.diet') },
    { href: '/workout', label: t('header.workout') },
    { href: '/health-metric', label: t('header.health') },
    { href: '/goals', label: t('header.setGoals') },
  ]

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-10 w-full">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* 로고 및 이름 */}
        <Link
          href="/my"
          className="text-xl font-bold flex items-center min-w-0"
        >
          <span className="shrink-0" style={({color: '#FF8000'})}>LiT</span>
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

        {/* 데스크탑: 메뉴 + 언어 토글 한 줄, 오른쪽 정렬 */}
        <div className="hidden sm:flex items-center gap-4">
          <nav className="flex gap-2 text-sm text-gray-700">
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
          <div className="flex items-center">
            <LanguageToggle />
          </div>
        </div>

        {/* 모바일: 언어 토글 + 햄버거 버튼 같이 한 줄 */}
        <div className="sm:hidden flex items-center gap-2">
          <LanguageToggle />
          <button
            className="p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col px-6 py-8 sm:hidden overflow-y-auto">
          {/* 닫기 버튼 */}
          <div className="flex justify-end mb-6">
            <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <X size={28} />
            </button>
          </div>

          {/* 메뉴 리스트 */}
          <div className="flex flex-col gap-3 text-sm font-medium text-gray-800">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-2 py-2 rounded-md transition active:scale-95 ${
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
