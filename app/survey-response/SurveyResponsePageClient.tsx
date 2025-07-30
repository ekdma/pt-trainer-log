'use client'

import { useEffect, useState } from 'react'
// import TrainerHeader from '@/components/layout/TrainerHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase'
import SurveyResponse from '@/components/survey-response/SurveyResponse'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthGuard } from '@/hooks/useAuthGuard'

function formatPhoneDisplay(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return digits
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

export default function SurveyResponsePage() {
  const supabase = getSupabaseClient()
  const searchParams = useSearchParams()
  const router = useRouter()

  const surveyId = searchParams.get('surveyID')
  const memberIdFromUrl = searchParams.get('member_counsel_id')

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useAuthGuard()

  // ✅ URL에 member_counsel_id가 있으면 바로 SurveyResponse 보여주기
  useEffect(() => {
    if (memberIdFromUrl) {
      const id = parseInt(memberIdFromUrl, 10)
      if (!isNaN(id)) {
        setCurrentMemberId(id)
      }
    }
  }, [memberIdFromUrl])

  const handleSubmit = async () => {
    const digitsOnlyPhone = phone.replace(/\D/g, '')

    if (!name.trim()) return toast.error('이름을 입력해주세요.')
    if (!birthDate) return toast.error('생년월일을 입력해주세요.')
    if (!phone.trim()) return toast.error('휴대폰 번호를 입력해주세요.')
    if (!gender) return toast.error('성별을 선택해주세요.')

    setLoading(true)

    try {
      const { data, error } = await supabase.from('members_counsel')
        .insert([
          {
            name: name.trim(),
            birth_date: birthDate,
            phone: digitsOnlyPhone,
            gender,
          },
        ])
        .select('member_counsel_id')
        .single()

      if (error) throw error

      toast.success('상담 회원 정보가 저장되었습니다.')

      // ✅ 이 URL로 이동하면 useEffect에서 자동 렌더됨
      router.push(`/survey-response?surveyID=${surveyId}&member_counsel_id=${data.member_counsel_id}`)
    } catch (err) {
      console.error(err)
      toast.error('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.replace('/survey-response') // 돌아왔을 때 다시 초기 입력 화면
    setCurrentMemberId(null)
  }

  // ✅ 조건에 따라 응답 폼 보여주기
  if (surveyId && currentMemberId) {
    return (
      <SurveyResponse
        surveyId={surveyId}
        currentMemberId={currentMemberId}
        onBack={handleBack}
      />
    )
  }

  // ✅ 초기 상태: 정보 입력 폼
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* <TrainerHeader /> */}
      <main className="flex-grow flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
            상담 회원 기본정보 입력
          </h2>

          <div className="space-y-5">
            <Input
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="bg-white text-gray-600 border border-gray-300 rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />

            <Input
              type="date"
              placeholder="생년월일"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={loading}
              className="bg-white text-gray-600 border border-gray-300 rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />

            <Input
              placeholder="휴대폰 번호"
              value={formatPhoneDisplay(phone)}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))
              }
              disabled={loading}
              className="bg-white text-gray-600 border border-gray-300 rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />

            <select
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={loading}
            >
              <option value="" disabled>
                성별 선택
              </option>
              <option value="male">남성</option>
              <option value="female">여성</option>
              <option value="other">기타</option>
            </select>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-lg py-3 shadow-lg transition"
            >
              {loading ? '저장 중...' : '상담 시작'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
