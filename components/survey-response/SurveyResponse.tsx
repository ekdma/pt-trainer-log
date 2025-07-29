'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
  const supabase = getSupabaseClient()
  const router = useRouter()

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [answers, setAnswers] = useState<{
    [questionId: string]: string | string[] // 단일선택/주관식: string, 복수선택: string[]
  }>({})

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
          alert('설문 정보를 불러오는데 실패했습니다.')
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
          alert('질문을 불러오는데 실패했습니다.')
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
        alert('데이터를 불러오는 중 오류가 발생했습니다.')
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
        alert('모든 질문에 답변해 주세요.')
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
          member_counsel_id: currentMemberId,
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
          const selectedOptionIds =
            q.question_type === 'single'
              ? [answers[q.id] as string]
              : (answers[q.id] as string[])
      
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

      alert('설문이 성공적으로 제출되었습니다.')
      router.push(`/survey-result?surveyID=${surveyId}&responseID=${responseId}&member_counsel_id=${currentMemberId}`)
      // onBack()
    } catch (e) {
      console.error(e)
      alert('설문 제출 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p>불러오는 중...</p>
  if (!survey) return <p>설문을 불러올 수 없습니다.</p>

  return (
    <div className="p-4 sm:p-8 lg:px-24 lg:py-12 bg-gray-50 min-h-screen">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-800">{survey.title}</h2>
        {survey.description && (
          <p className="text-gray-600 text-base sm:text-lg">{survey.description}</p>
        )}
      </div>

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
            <p className="text-lg font-semibold">{q.order + 1}. {q.question_text}</p>

            {/* 질문 유형별 렌더링 */}
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

        <div className="text-center">
          <Button variant='darkGray' disabled={loading}>
            {loading ? '제출 중...' : '제출'}
          </Button>
        </div>
      </form>
    </div>
  )
}
