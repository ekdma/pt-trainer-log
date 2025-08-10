'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
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
  const [lang, setLang] = useState<Lang>('ko')

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
