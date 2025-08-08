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

  const surveyIDs = searchParams.getAll('surveyID')
  const memberIdFromUrl = searchParams.get('member_counsel_id')
  // const surveyId = surveyIDs.length === 1 ? surveyIDs[0] : null

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [job, setJob] = useState('')

  const [preferredDays, setPreferredDays] = useState<string[]>([])  
  const [preferredTimes, setPreferredTimes] = useState<string[]>([])  

  const [goals, setGoals] = useState<string[]>([])
  const [customGoal, setCustomGoal] = useState('')
  const goalOptions = ['다이어트', '체지방 감량', '근육 증량', '바디프로필', '기타']

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

  const toggleDay = (day: string) => {
    setPreferredDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const toggleTime = (time: string) => {
    setPreferredTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    )
  }

  const handleSubmit = async () => {
    const digitsOnlyPhone = phone.replace(/\D/g, '')
    const fullGoals = [...goals.filter((g) => g !== '기타')]

    if (!name.trim()) return toast.error('이름을 입력해주세요.')
    if (!birthDate) return toast.error('생년월일을 입력해주세요.')
    if (!gender) return toast.error('성별을 선택해주세요.')
    if (!job.trim()) return toast.error('직업을 입력해주세요.')
    // if (!phone.trim()) return toast.error('휴대폰 번호를 입력해주세요.')
    if (preferredDays.length === 0)
      return toast.error('운동 희망하는 요일을 선택해주세요.')
    if (preferredTimes.length === 0)
      return toast.error('운동 희망하는 시간을 선택해주세요.')
    if (goals.includes('기타') && customGoal.trim()) {
      fullGoals.push(customGoal.trim())
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.from('members_counsel')
        .insert([
          {
            name: name.trim(),
            birth_date: birthDate,
            phone: digitsOnlyPhone || null,
            gender,
            job: job.trim(),
            preferred_days: preferredDays, 
            preferred_times: preferredTimes,
            goals: fullGoals,
          },
        ])
        .select('member_counsel_id')
        .single()

      if (error) throw error

      toast.success('상담 회원 정보가 저장되었습니다.')

      // ✅ 이 URL로 이동하면 useEffect에서 자동 렌더됨
      // router.push(`/survey-response?surveyID=${surveyId}&member_counsel_id=${data.member_counsel_id}`)
      const searchParamsString = surveyIDs
        .map((id) => `surveyID=${encodeURIComponent(id)}`)
        .join('&')

      router.push(
        `/survey-response?${searchParamsString}&member_counsel_id=${data.member_counsel_id}`
      )

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

  const timeOptions = []
  for (let hour = 9; hour <= 21; hour++) {
    const timeString = hour.toString().padStart(2, '0') + ':00'
    timeOptions.push(timeString)
  }

  // ✅ 2. 단일 설문: 기존 SurveyResponse
  if (surveyIDs && currentMemberId) {
    return (
      <SurveyResponse
        surveyIds={surveyIDs}
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
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 mb-4">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
            상담회원 정보 입력
          </h2>

          <div className="space-y-6">

            <fieldset className="border border-gray-300 rounded-lg p-4">
              <legend className="font-semibold mb-2">기본정보</legend>
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

                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm"
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

                <Input
                  placeholder="직업"
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  disabled={loading}
                  className="bg-white text-gray-600 border border-gray-300 rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />

                <Input
                  placeholder="휴대폰 번호(선택 사항)"
                  value={formatPhoneDisplay(phone)}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))
                  }
                  disabled={loading}
                  className="bg-white text-gray-600 border border-gray-300 rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
            </fieldset>

            <fieldset className="border border-gray-300 rounded-lg p-4">
              <legend className="font-semibold mb-2">운동 희망 요일</legend>
              <label className="inline-flex items-center mr-4 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={preferredDays.includes('weekdays')}
                  onChange={() => toggleDay('weekdays')}
                  disabled={loading}
                  className="mr-2"
                />
                평일
              </label>
              <label className="inline-flex items-center mr-4 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={preferredDays.includes('weekends')}
                  onChange={() => toggleDay('weekends')}
                  disabled={loading}
                  className="mr-2"
                />
                주말
              </label>
            </fieldset>

            <fieldset className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
              <legend className="font-semibold mb-2">운동 희망 시간</legend>

              <div className="space-y-4">
                {/* 오전 */}
                <div>
                  <div className="font-semibold text-gray-600 mb-1">오전</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {timeOptions
                      .filter((time) => parseInt(time.split(':')[0]) < 12)
                      .map((time) => (
                        <label
                          key={time}
                          className="inline-flex items-center cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={preferredTimes.includes(time)}
                            onChange={() => toggleTime(time)}
                            disabled={loading}
                            className="mr-1"
                          />
                          {time}
                        </label>
                      ))}
                  </div>
                </div>

                {/* 오후 */}
                <div>
                  <div className="font-semibold text-gray-600 mb-1">오후</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {timeOptions
                      .filter((time) => parseInt(time.split(':')[0]) >= 12)
                      .map((time) => (
                        <label
                          key={time}
                          className="inline-flex items-center cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={preferredTimes.includes(time)}
                            onChange={() => toggleTime(time)}
                            disabled={loading}
                            className="mr-1"
                          />
                          {time}
                        </label>
                      ))}
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="border border-gray-300 rounded-lg p-4">
              <legend className="font-semibold mb-2">운동 목적</legend>
              <div className="flex flex-wrap gap-3">
                {goalOptions.map((goal) => (
                  <label
                    key={goal}
                    className="inline-flex items-center text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={goals.includes(goal)}
                      onChange={() => {
                        if (goals.includes(goal)) {
                          setGoals(goals.filter((g) => g !== goal))
                          if (goal === '기타') setCustomGoal('')
                        } else {
                          setGoals([...goals, goal])
                        }
                      }}
                      disabled={loading}
                      className="mr-2"
                    />
                    {goal}
                  </label>
                ))}
              </div>

              {goals.includes('기타') && (
                <div className="mt-3">
                  <Input
                    placeholder="기타 목적을 입력해주세요"
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    disabled={loading}
                    className="bg-white text-gray-600 border border-gray-300 rounded-lg px-4 py-2 mt-1 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
              )}
            </fieldset>

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
