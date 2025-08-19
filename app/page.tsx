import LoginPage from './login/page'  
import { LanguageProvider } from '@/context/LanguageContext'

export default function Page() {
  return (
    <LanguageProvider>
      <LoginPage />
    </LanguageProvider>
  )
}