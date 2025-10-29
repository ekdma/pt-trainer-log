'use client'

import React, { createContext, useContext, useState, ReactNode, useSyncExternalStore } from 'react'
import en from '@/locales/en.json'
import ko from '@/locales/ko.json'

type Lang = 'en' | 'ko'
const translations = { en, ko }

const getInitial = (): Lang => {
  if (typeof window === 'undefined') return 'ko'

  const saved = localStorage.getItem('litpt_lang')
  // saved 값이 'en' 또는 'ko'일 경우 해당 값을 반환하고, 아니면 'ko'를 반환
  return (saved === 'en' || saved === 'ko') ? (saved as Lang) : 'ko'
}

let currentLang: Lang = getInitial()
const listeners = new Set<() => void>()

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

const getSnapshot = (): Lang => currentLang // lang을 Lang 타입으로 반환

const getServerSnapshot = (): Lang => 'ko'

export const setGlobalLang = (lang: Lang) => {
  currentLang = lang
  if (typeof window !== 'undefined') {
    localStorage.setItem('litpt_lang', lang)
    document.documentElement.lang = lang
  }
  listeners.forEach(fn => fn())
}

const LanguageContext = createContext<{
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}>({
  lang: 'ko',  // 기본값 'ko'
  setLang: () => {},
  t: (key: string) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  // lang을 Lang 타입으로 명시적으로 지정
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setLang = (newLang: Lang) => {
    setGlobalLang(newLang)
  }

  const t = (key: string) => {
    const keys = key.split('.')
    let value: any = (translations as Record<string, any>)[lang]
    keys.forEach(k => (value = value?.[k]))
    return value ?? key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
