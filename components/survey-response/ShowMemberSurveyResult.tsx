import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface SurveyOption {
  id: string
  option_text: string
}

interface SurveyQuestion {
  question_text: string
  question_type: 'single' | 'multiple' | 'text'
  survey_options: SurveyOption[]
}

interface SurveyAnswer {
  question_id: string
  answer_text: string | null
  selected_option_ids: string[] | null
  survey_questions: SurveyQuestion
}

interface RawSurveyAnswer {
  question_id: string
  answer_text: string | null
  selected_option_ids: string[] | null
  survey_questions: SurveyQuestion | SurveyQuestion[]
}

interface MemberCounsel {
  member_counsel_id: number
  name: string
  birth_date: string
  phone: string | null
  gender: string
  job: string | null
  preferred_days: string[] | null
  preferred_times: string[] | null
  goals: string[] | null
}

interface Props {
  selectedMemberId?: number
}

function formatPhoneDisplay(phone: string | null | undefined) {
  if (!phone) return '-'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return digits
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

export default function ShowMemberSurveyResult({ selectedMemberId }: Props) {
  const supabase = getSupabaseClient()
  const searchParams = useSearchParams()

  const isBrowser = typeof window !== 'undefined'
  const surveyIdFromUrl = isBrowser ? searchParams.get('surveyID') : null
  const memberCounselIdFromUrl = isBrowser ? searchParams.get('member_counsel_id') : null
  // const memberCounselId = memberCounselIdFromUrl || selectedMemberId?.toString()

  const [result, setResult] = useState<SurveyAnswer[]>([])
  const [member, setMember] = useState<MemberCounsel | null>(null)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)  // submitted_at 저장용
  const [loading, setLoading] = useState(true)
  const [memberLoading, setMemberLoading] = useState(true)

  const [surveyTitle, setSurveyTitle] = useState<string | null>(null)
  const [surveyDescription, setSurveyDescription] = useState<string | null>(null)

  const today = new Date().toLocaleDateString()
  const [signatureData, setSignatureData] = useState<string | null>(null)

  useEffect(() => {
    if (!surveyIdFromUrl) return
  
    const fetchSurveyInfo = async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select('title, description')
        .eq('id', surveyIdFromUrl)
        .single()
  
      if (error) {
        console.error('설문 정보 조회 실패:', error)
      } else {
        setSurveyTitle(data.title)
        setSurveyDescription(data.description)
      }
    }
  
    fetchSurveyInfo()
  }, [surveyIdFromUrl])
  
  const fetchResult = async (targetMemberCounselId: string) => {
    setLoading(true)
  
    const { data: response, error: responseError } = await supabase
      .from('survey_responses')
      .select('id, submitted_at')
      .eq('survey_id', surveyIdFromUrl)
      .eq('member_counsel_id', targetMemberCounselId)  // 수정됨
      .single()
  
    if (responseError || !response) {
      console.error('응답 조회 실패:', responseError)
      // alert('응답 정보를 찾을 수 없습니다.')
      toast.error('응답 정보를 찾을 수 없습니다.')
      setLoading(false)
      return
    }
  
    const responseId = response.id
    setSubmittedAt(response.submitted_at)
  
    const { data, error } = await supabase
      .from('survey_answers')
      .select(`
        question_id,
        answer_text,
        selected_option_ids,
        survey_questions (
          question_text,
          question_type,
          survey_options (
            id,
            option_text
          )
        )
      `)
      .eq('response_id', responseId)
  
    if (error) {
      console.error('답변 로드 실패:', error)
      // alert('결과를 불러오는 중 오류 발생')
      toast.error('결과를 불러오는 중 오류 발생하였습니다.')
    } else if (data) {
      const normalizedData = data.map((item: RawSurveyAnswer): SurveyAnswer => ({
        question_id: item.question_id,
        answer_text: item.answer_text,
        selected_option_ids: item.selected_option_ids,
        survey_questions: Array.isArray(item.survey_questions)
          ? item.survey_questions[0]
          : item.survey_questions,
      }))
      setResult(normalizedData)
    }
  
    setLoading(false)
  }
  
  useEffect(() => {
    const finalMemberCounselId = memberCounselIdFromUrl || selectedMemberId?.toString()
    if (!surveyIdFromUrl || !finalMemberCounselId) return
  
    fetchResult(finalMemberCounselId)
  }, [surveyIdFromUrl, memberCounselIdFromUrl, selectedMemberId])

  useEffect(() => {
    const finalMemberCounselId = memberCounselIdFromUrl || selectedMemberId?.toString()
    if (!finalMemberCounselId) return
  
    const fetchMember = async () => {
      setMemberLoading(true)
      const { data, error } = await supabase
        .from('members_counsel')
        .select(`
          member_counsel_id,
          name,
          birth_date,
          phone,
          gender,
          job,
          preferred_days,
          preferred_times,
          goals
        `)
        .eq('member_counsel_id', finalMemberCounselId)
        .single()

  
      if (error) {
        console.error(error)
        // alert('회원 정보를 불러오는 중 오류 발생')
        toast.error('회원 정보를 불러오는 중 오류 발생하였습니다.')
      } else {
        setMember(data)
      }
      setMemberLoading(false)
    }
  
    fetchMember()
  }, [memberCounselIdFromUrl, selectedMemberId])

  useEffect(() => {
    const sig = localStorage.getItem('signature')
    setSignatureData(sig)
  }, [])


  if (loading || memberLoading) {
    return (
      <div className="p-6 text-center text-gray-500">결과 불러오는 중...</div>
    )
  }
  
  if (!result || result.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">결과가 없습니다.</div>
    )
  }

  return (
    <div className="p-4 sm:p-8 lg:px-24 lg:py-12 bg-gray-50 min-h-screen max-w-3xl mx-auto">
      {memberCounselIdFromUrl && (
      <div>
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="text-sm"
        >
          ← 뒤로가기
        </Button>
      </div>
    )}
      <h2 className="text-xl sm:text-xl font-bold mb-8 text-gray-800 text-center">📝 응답 결과</h2>
      {member && (
        <div className="mb-10 bg-gray-100 p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">회원 기본 정보</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-gray-900 text-[15px]">
            <div><strong>이름:</strong> {member.name}</div>
            <div><strong>생년월일:</strong> {member.birth_date}</div>
            <div><strong>휴대폰:</strong> {formatPhoneDisplay(member.phone)}</div>
            <div><strong>성별:</strong> {member.gender}</div>
            <div><strong>직업:</strong> {member.job || '-'}</div>
            {submittedAt && (
              <div><strong>응답 일시:</strong> {new Date(submittedAt).toLocaleString()}</div>
            )}
            <div className="sm:col-span-2">
              <strong>운동 희망 요일:</strong>
              <div className="flex flex-wrap gap-2 mt-1">
                {member.preferred_days && member.preferred_days.length > 0
                  ? member.preferred_days.map((day) => (
                      <span key={day} className="px-2 py-1 bg-rose-100 text-rose-800 text-sm rounded-full">
                        {day}
                      </span>
                    ))
                  : <span className="text-gray-500">-</span>
                }
              </div>
            </div>

            <div className="sm:col-span-2">
              <strong>운동 희망 시간:</strong>
              <div className="flex flex-wrap gap-2 mt-1">
                {member.preferred_times && member.preferred_times.length > 0
                  ? member.preferred_times.map((time) => (
                      <span key={time} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
                        {time}
                      </span>
                    ))
                  : <span className="text-gray-500">-</span>
                }
              </div>
            </div>

            <div className="sm:col-span-2">
              <strong>운동 목표:</strong>
              <div className="flex flex-wrap gap-2 mt-1">
                {member.goals && member.goals.length > 0
                  ? member.goals.map((goal) => (
                      <span key={goal} className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                        {goal}
                      </span>
                    ))
                  : <span className="text-gray-500">-</span>
                }
              </div>
            </div>

          </div>
        </div>
      )}

      {surveyTitle && (
        <div className="mb-8 bg-white p-6 rounded-2xl shadow-md border border-gray-200 space-y-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">{surveyTitle}</h3>
          {surveyDescription && (
            // <p className="text-gray-600 mt-2 whitespace-pre-line">{surveyDescription}</p>
            <h3 className="text-sm text-gray-700 mb-4 pb-2">{surveyDescription}</h3>
          )}
        </div>
      )}

      <div className='space-y-6'>
        {result.map((item, idx) => {
          const { survey_questions, selected_option_ids, answer_text } = item
          const { question_text, question_type, survey_options } = survey_questions

          return (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 space-y-4 hover:bg-rose-50 transition"
            >
              <p className="text-lg font-semibold text-gray-800 flex items-center gap-3">
                <span className="text-gray-600 font-extrabold">{idx + 1}.</span>
                {question_text}
              </p>

              {/* 객관식(single) */}
              {question_type === 'single' && (
                <div className="space-y-2">
                  {survey_options.map((opt) => {
                    const isSelected = selected_option_ids?.includes(opt.id) ?? false
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-3 p-2 border rounded-lg cursor-default select-none ${
                          isSelected ? 'font-semibold text-gray-700' : 'text-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          checked={isSelected}
                          readOnly
                          className="accent-gray-600 cursor-default"
                        />
                        <span>{opt.option_text}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {/* 객관식(multiple) */}
              {question_type === 'multiple' && (
                <div className="space-y-2">
                  {survey_options.map((opt) => {
                    const isSelected = selected_option_ids?.includes(opt.id) ?? false
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-3 p-2 border rounded-lg cursor-default select-none ${
                          isSelected ? 'font-semibold text-gray-700' : 'text-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="accent-gray-600 cursor-default"
                        />
                        <span>{opt.option_text}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {/* 주관식(text) */}
              {question_type === 'text' && (
                <textarea
                  readOnly
                  value={answer_text || ''}
                  className="w-full border rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                  rows={5}
                />
              )}
            </div>
          )
        })}

        <div
          className="bg-white border border-gray-300 rounded-2xl p-4 shadow-md flex items-center justify-center gap-x-8"
        >
          {/* 오늘 날짜 */}
          <div className="text-gray-700 text-xl whitespace-nowrap">
            <strong>{today}</strong>
          </div>

          {member?.name && (
            <div className="text-gray-800 text-xl font-semibold whitespace-nowrap">
              {member.name}
            </div>
          )}

          {/* 서명 영역 */}
          <div className="flex flex-col items-center">
            <p className="text-gray-700 font-semibold mb-2">서명</p>
            {signatureData ? (
              <img
                src={signatureData}
                alt="서명 이미지"
                className="border border-gray-400 rounded-lg bg-gray-100 w-[300px] h-[100px] object-contain"
              />
            ) : (
              <p className="text-sm text-gray-400 italic">서명이 없습니다.</p>
            )}
          </div>

        </div>
      </div>
    </div>

  )
}
