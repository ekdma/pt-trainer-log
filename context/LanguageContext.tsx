'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import en from '@/locales/en.json'
import ko from '@/locales/ko.json'

type Lang = 'en' | 'ko'
const translations = { en, ko }

const LanguageContext = createContext<{
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}>({
  lang: 'ko',
  setLang: () => {},
  t: (key: string) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko')

  // ✅ 초기값을 localStorage에서 가져오기 + 로그인 페이지 포함 모든 페이지에서 동기화
  useEffect(() => {
    const storedLang = localStorage.getItem('litpt_lang') as Lang
    if (storedLang) {
      setLangState(storedLang)
    }
  }, [])

  const setLang = (newLang: Lang) => {
    setLangState(newLang)
    localStorage.setItem('litpt_lang', newLang)
  }

  const t = (key: string) => {
    const keys = key.split('.')
    let value: any = translations[lang]
    keys.forEach(k => {
      value = value?.[k]
    })
    return value || key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)