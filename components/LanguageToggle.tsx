'use client'
import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import Image from 'next/image'
import { HiOutlineGlobeAlt } from 'react-icons/hi'

type Lang = 'ko' | 'en'

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // 초기 화면 크기 체크
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()

    // 리사이즈 이벤트 핸들러 등록
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const options: { code: Lang; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    {
      code: 'ko',
      label: '한국어',
      shortLabel: 'KO',
      icon: <Image src="/flags/kr.png" alt="한국어" width={20} height={14} className="rounded-sm" />,
    },
    {
      code: 'en',
      label: 'English',
      shortLabel: 'EN',
      icon: <HiOutlineGlobeAlt size={18} color="#3b82f6" />
    },
  ]

  return (
    <div className="flex justify-end items-center">
      <div className="flex rounded-full border border-gray-300 bg-white shadow-sm overflow-hidden">
        {options.map(({ code, label, shortLabel, icon }) => (
          <button
            key={code}
            onClick={() => setLang(code)}
            className={`flex items-center gap-2 px-2 py-1.5 text-xs font-medium leading-none transition-all duration-200 
              ${lang === code
                ? 'bg-indigo-600 text-white shadow-inner'
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            {icon}
            <span>{isMobile ? shortLabel : label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
