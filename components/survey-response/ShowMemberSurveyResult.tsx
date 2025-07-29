import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

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
  phone: string
  gender: string
}

interface Props {
  selectedMemberId?: number
}

function formatPhoneDisplay(phone: string) {
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
  const memberCounselId = memberCounselIdFromUrl || selectedMemberId?.toString()

  const [result, setResult] = useState<SurveyAnswer[]>([])
  const [member, setMember] = useState<MemberCounsel | null>(null)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)  // submitted_at 저장용
  const [loading, setLoading] = useState(true)
  const [memberLoading, setMemberLoading] = useState(true)

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
      alert('응답 정보를 찾을 수 없습니다.')
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
      alert('결과를 불러오는 중 오류 발생')
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
        .select('member_counsel_id, name, birth_date, phone, gender')
        .eq('member_counsel_id', finalMemberCounselId)  // 수정됨
        .single()
  
      if (error) {
        console.error(error)
        alert('회원 정보를 불러오는 중 오류 발생')
      } else {
        setMember(data)
      }
      setMemberLoading(false)
    }
  
    fetchMember()
  }, [memberCounselIdFromUrl, selectedMemberId])

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
    <div className="space-y-10 max-w-3xl mx-auto bg-white p-8 rounded-3xl shadow-lg">
      <h2 className="text-2xl font-extrabold mb-8 text-center text-gray-700">📝 응답 결과</h2>

      {member && (
        <div className="mb-10 border border-gray-300 rounded-xl bg-gray-100 p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-700 mb-4 border-b border-gray-300 pb-2">회원 기본 정보</h3>
          <ul className="space-y-2 text-gray-900 text-lg">
            <li><strong>이름:</strong> {member.name}</li>
            <li><strong>생년월일:</strong> {member.birth_date}</li>
            <li><strong>휴대폰:</strong> {formatPhoneDisplay(member.phone)}</li>
            <li><strong>성별:</strong> {member.gender}</li>
            {submittedAt && (
              <li><strong>응답 일시:</strong> {new Date(submittedAt).toLocaleString()}</li>
            )}
          </ul>
        </div>
      )}

      {result.map((item, idx) => {
        const { survey_questions, selected_option_ids, answer_text } = item
        const { question_text, question_type, survey_options } = survey_questions

        return (
          <div
            key={idx}
            className="space-y-4 border border-gray-300 rounded-xl shadow-inner p-6 bg-gray-50 hover:bg-gray-100 transition"
          >
            <p className="font-semibold text-xl text-gray-800 flex items-center gap-3">
              <span className="text-gray-600 font-extrabold">{idx + 1}.</span>
              {question_text}
            </p>

            {/* 객관식(single) */}
            {question_type === 'single' && (
              <div className="space-y-3 pl-4">
                {survey_options.map((opt) => {
                  const isSelected = selected_option_ids?.includes(opt.id) ?? false
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-3 cursor-default select-none ${
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
              <div className="space-y-3 pl-4">
                {survey_options.map((opt) => {
                  const isSelected = selected_option_ids?.includes(opt.id) ?? false
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-3 cursor-default select-none ${
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
                className="w-full border border-gray-300 rounded-lg p-4 bg-white text-gray-900 resize-none shadow-inner focus:outline-none"
                rows={5}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
