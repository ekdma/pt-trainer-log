import { LanguageProvider } from '@/context/LanguageContext'
import LoginPage from '@/components/login/LoginPage'

export default function Page() {
  return (
    <LanguageProvider>
      <LoginPage />
    </LanguageProvider>
  )
}
