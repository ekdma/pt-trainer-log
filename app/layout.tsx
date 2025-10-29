'use client'

import './globals.css'
import { Toaster } from 'sonner'
import { LanguageProvider, useLanguage } from '@/context/LanguageContext'
import { AuthProvider } from '@/context/AuthContext'
import AuthGuard from '@/components/AuthGuard'

function LayoutInner({ children }: { children: React.ReactNode }) {
  // ✅ 컨텍스트의 lang을 <html lang={lang}>에 직접 바인딩
  const { lang } = useLanguage()
  const isLogin = typeof window !== 'undefined' && window.location.pathname.startsWith('/login')

  return (
    <html lang={lang}>
      <body className="font-nanum bg-gray-50 min-h-screen">
        <AuthProvider>
          {isLogin ? children : <AuthGuard>{children}</AuthGuard>}
          <Toaster position="top-right" richColors expand />
        </AuthProvider>
      </body>
    </html>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ✅ LanguageProvider를 최상단으로 끌어올리고,
  //    LayoutInner 안에서 lang을 <html>에 반영
  return (
    <LanguageProvider>
      <LayoutInner>{children}</LayoutInner>
    </LanguageProvider>
  )
}
