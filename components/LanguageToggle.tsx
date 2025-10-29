'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { HiOutlineGlobeAlt } from 'react-icons/hi'

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage()
  const [isMobile, setIsMobile] = useState(false)

  // 디버깅용 함수: 선택된 언어와 상태를 로그로 확인
  const handleToggle = (code: string) => {
    console.log('Current language:', lang) // 현재 언어 출력
    console.log('Selected language code:', code) // 선택된 언어 코드 출력

    // code가 'ko' 또는 'en' 인지 확인하고, 그렇지 않으면 'ko'로 처리
    const langCode: 'ko' | 'en' = code === 'ko' || code === 'en' ? code : 'ko'
    console.log('Normalized language code:', langCode) // 변경된 언어 코드 출력

    setLang(langCode)
    localStorage.setItem("litpt_lang", langCode)

    console.log('Language after setLang:', langCode) // setLang 호출 후 언어 상태 출력
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // 리사이즈 이벤트가 끝난 후에 상태 출력
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const options = [
    { code: 'ko', label: '한국어', shortLabel: 'KO', icon: <img src="/flags/kr.png" alt="한국어" width={20} height={14} /> },
    { code: 'en', label: 'English', shortLabel: 'EN', icon: <HiOutlineGlobeAlt size={18} color="#3b82f6" /> }
  ]

  useEffect(() => {
    console.log('Current lang from context:', lang) // Context에서 가져온 현재 언어 상태 출력
  }, [lang]) // lang이 변경될 때마다 로그 출력

  return (
    <div className="flex justify-end items-center">
      <div className="flex rounded-full border border-gray-300 bg-white shadow-sm overflow-hidden">
        {options.map(({ code, label, shortLabel, icon }) => (
          <button
            key={code}
            onClick={() => handleToggle(code)}
            className={`flex items-center gap-2 px-2 py-1.5 text-xs font-medium transition-all duration-200 
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
