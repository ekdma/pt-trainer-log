'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { HiOutlineGlobeAlt } from 'react-icons/hi'

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage()
  const [isMobile, setIsMobile] = useState(false)

  const handleToggle = (code: string) => {
    const langCode: 'ko' | 'en' = code === 'ko' || code === 'en' ? code : 'ko'
    setLang(langCode)
    localStorage.setItem("litpt_lang", langCode)
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const options = [
    { code: 'ko', label: '한국어', shortLabel: 'KO', icon: <img src="/flags/kr.png" alt="한국어" width={16} height={12} /> },
    { code: 'en', label: 'English', shortLabel: 'EN', icon: <HiOutlineGlobeAlt size={14} color="#3b82f6" /> }
  ]

  return (
    <div className="flex justify-end items-center">
      <div className="flex rounded-full border border-gray-300 bg-white shadow-lg overflow-hidden">
        {options.map(({ code, label, shortLabel, icon }) => (
          <button
            key={code}
            onClick={() => handleToggle(code)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all duration-300 
              ${lang === code
                ? 'bg-gradient-to-r from-indigo-400 to-indigo-600 text-white shadow-xl'
                : 'text-gray-600 hover:bg-indigo-100 hover:text-indigo-600'
              }
              rounded-full hover:scale-105 transform active:scale-95`}
          >
            {icon}
            <span>{isMobile ? shortLabel : label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
