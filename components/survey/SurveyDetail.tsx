'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface SurveyDetailProps {
  surveyId: string
  currentMemberId: number
  onBack: () => void
}

interface Survey {
  id: string
  title: string
  description?: string
}

interface Question {
  id: string
  question_text: string
  question_type: 'single' | 'multiple' | 'text'
  order: number
  options: Option[]
}

interface Option {
  id: string
  option_text: string
  order: number
}

export default function SurveyDetail({
  surveyId,
  currentMemberId,
  onBack,
}: SurveyDetailProps) {
  const router = useRouter()
  const supabase = getSupabaseClient()

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [answers, setAnswers] = useState<{
    [questionId: string]: string | string[] // 단일선택/주관식: string, 복수선택: string[]
  }>({})
  const [mode, setMode] = useState<'response' | 'result' | null>(null)
  const [showResponseTypeModal, setShowResponseTypeModal] = useState(false)
  
  useEffect(() => {
    if (mode === 'response') {
      router.push(`/survey-response?surveyID=${surveyId}`)
    } else if (mode === 'result') {
      router.push(`/survey-result?surveyID=${surveyId}`)
    }
  }, [mode, router, surveyId])

  // 설문 및 질문 불러오기
  useEffect(() => {
    const fetchSurveyData = async () => {
      setLoading(true)
      try {
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select('id, title, description')
          .eq('id', surveyId)
          .single()
  
        if (surveyError) {
          setLoading(false)
          // alert('설문 정보를 불러오는데 실패했습니다.')
          toast.error('설문 정보를 불러오는데 실패했습니다.')
          onBack()
          return
        }
        setSurvey(surveyData)
  
        const { data: questionsData, error: questionsError } = await supabase
          .from('survey_questions')
          .select('id, question_text, question_type, order')
          .eq('survey_id', surveyId)
          .order('order', { ascending: true })
  
        if (questionsError) {
          setLoading(false)
          // alert('질문을 불러오는데 실패했습니다.')
          toast.error('질문을 불러오는데 실패했습니다.')
          onBack()
          return
        }
  
        const questionsWithOptions = await Promise.all(
          (questionsData || []).map(async (q) => {
            const { data: options, error: optionsError } = await supabase
              .from('survey_options')
              .select('id, option_text, order')
              .eq('question_id', q.id)
              .order('order', { ascending: true })
  
            if (optionsError) {
              throw optionsError
            }
            return { ...q, options: options || [] }
          }),
        )
  
        setQuestions(questionsWithOptions)
      } catch (error) {
        console.error(error)
        setLoading(false)
        // alert('데이터를 불러오는 중 오류가 발생했습니다.')
        toast.error('데이터를 불러오는 중 오류가 발생했습니다.')
        onBack()
      } finally {
        setLoading(false)
      }
    }
  
    fetchSurveyData()
  }, [surveyId]) // supabase, onBack 제거

  // 답변 변경 핸들러
  const handleChangeAnswer = (
    questionId: string,
    value: string | string[],
  ) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  // 응답 제출
  const handleSubmit = async () => {
    // 간단 검증
    for (const q of questions) {
      if (
        answers[q.id] === undefined ||
        answers[q.id] === '' ||
        (Array.isArray(answers[q.id]) && answers[q.id].length === 0)
      ) {
        // alert('모든 질문에 답변해 주세요.')
        toast.warning('모든 질문에 답변해 주세요.')
        return
      }
    }

    setLoading(true)

    try {
      // survey_responses 삽입
      const { data: responseData, error: responseError } = await supabase
        .from('survey_responses')
        .insert({
          survey_id: surveyId,
          member_id: currentMemberId,
        })
        .select('id')
        .single()

      if (responseError) throw responseError

      const responseId = responseData.id

      // survey_answers 일괄 삽입 준비
      const answersToInsert = questions.map((q) => {
        if (q.question_type === 'text') {
          return {
            response_id: responseId,
            question_id: q.id,
            selected_option_ids: [],
            answer_text: answers[q.id] as string,
          }
        } else {
          // 객관식(single), 체크박스(multiple)
          const selectedOptionIds = answers[q.id] as string[]
          return {
            response_id: responseId,
            question_id: q.id,
            selected_option_ids: selectedOptionIds,
            answer_text: null,
          }
        }
      })

      const { error: answerError } = await supabase
        .from('survey_answers')
        .insert(answersToInsert)

      if (answerError) throw answerError

      // alert('설문이 성공적으로 제출되었습니다.')
      toast.success('설문이 성공적으로 제출되었습니다.')
      onBack()
    } catch (e) {
      console.error(e)
      // alert('설문 제출 중 오류가 발생했습니다.')
      toast.error('설문 제출 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleClickResponseButton = () => {
    setShowResponseTypeModal(true)
  }

  // 신규 상담회원 선택
  const handleSelectNewMember = () => {
    setShowResponseTypeModal(false)
    router.push(`/survey-response?surveyID=${surveyId}`)
  }

  // 기존 회원 선택 (아무 동작 없음)
  const handleSelectExistingMember = () => {
    setShowResponseTypeModal(false)
    // 아무 동작 없음
  }

  if (loading) return <p>불러오는 중...</p>
  if (!survey) return <p>설문을 불러올 수 없습니다.</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 flex items-center gap-1"
        >
          <ArrowLeft size={16} />
          돌아가기
        </Button>

        <div className="space-x-2 relative">
          <Button
            variant="darkGray"
            className="text-sm"
            onClick={handleClickResponseButton}
          >
            응답
          </Button>
          <Button
            variant="lightGray"
            className="text-sm"
            onClick={() => setMode('result')}
          >
            결과
          </Button>

          {/* 모달 */}
          {showResponseTypeModal && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
              <button
                onClick={handleSelectNewMember}
                className="block w-full text-left px-4 py-2 hover:bg-indigo-100"
              >
                신규 상담회원
              </button>
              <button
                onClick={handleSelectExistingMember}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 cursor-not-allowed text-gray-400"
                disabled
              >
                기존 회원 (미정)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* <h2 className="text-2xl font-semibold mb-2">{survey.title}</h2>
      {survey.description && (
        <p className="mb-6 text text-gray-600 mt-1 whitespace-pre-line">{survey.description}</p>
      )} */}

      {survey.title && (
        <div className="mb-8 bg-white p-6 rounded-2xl shadow-md border border-gray-200 space-y-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">{survey.title}</h3>
          {survey.description && (
            // <p className="text-gray-600 mt-2 whitespace-pre-line">{surveyDescription}</p>
            <h3 className="text-sm text-gray-700 mb-4 pb-2 whitespace-pre-line">{survey.description}</h3>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        className="space-y-6"
      >
        {questions.map((q) => (
          <div
            key={q.id}
            className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 space-y-4"
          >
            <p className="text-lg font-semibold">
              {q.order + 1}. {q.question_text}
            </p>

            {q.question_type === 'single' && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-rose-50 transition"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.id}
                      checked={answers[q.id] === opt.id}
                      onChange={() => handleChangeAnswer(q.id, opt.id)}
                      required
                    />
                    <span className="text-gray-800">{opt.option_text}</span>
                  </label>
                ))}
              </div>
            )}

            {q.question_type === 'multiple' && (
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const selectedOptions = answers[q.id] || []
                  return (
                    <label
                      key={opt.id}
                      className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-rose-50 transition"
                    >
                      <input
                        type="checkbox"
                        value={opt.id}
                        checked={selectedOptions.includes(opt.id)}
                        onChange={(e) => {
                          const checked = e.target.checked
                          let newSelected = [...selectedOptions]
                          if (checked) newSelected.push(opt.id)
                          else newSelected = newSelected.filter((id) => id !== opt.id)
                          handleChangeAnswer(q.id, newSelected)
                        }}
                        required={selectedOptions.length === 0}
                      />
                      <span className="text-gray-800">{opt.option_text}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {q.question_type === 'text' && (
              <textarea
                className="w-full border rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="답변을 입력하세요"
                value={answers[q.id] || ''}
                onChange={(e) => handleChangeAnswer(q.id, e.target.value)}
                required
              />
            )}
          </div>
        ))}
      </form>

    </div>
  )
}
