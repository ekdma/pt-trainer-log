import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nanum_Gothic } from "next/font/google";
import { Montserrat } from 'next/font/google'
import { Toaster } from 'sonner'
import { LanguageProvider } from '@/context/LanguageContext'
import AuthGuard from '@/components/AuthGuard'
import { AuthProvider } from '@/context/AuthContext'

const montserrat = Montserrat({
  weight: ['700'], // Bold
  subsets: ['latin'],
  variable: '--font-montserrat',
})

const nanumGothic = Nanum_Gothic({
  weight: ["400", "700", "800"], // 사용할 굵기 지정
  subsets: ["latin"],
  variable: "--font-nanum-gothic", // 커스텀 CSS 변수
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LiT PT",
  description: "LiT Personal Training",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${nanumGothic.variable} ${montserrat.variable} font-nanum antialiased`}
      >
        <AuthProvider>
          <LanguageProvider>
            {typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') ? (
              <AuthGuard>
                {children}
              </AuthGuard>
            ) : (
              children
            )}
            <Toaster position="top-right" richColors expand />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
