'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface SurveyResultMultiProps {
  surveyIds: string[]
  memberCounselId: number
}

interface Survey {
  id: string
  title: string
}

interface Question {
  id: string
  question_text: string
  question_type: 'single' | 'multiple' | 'text'
  options: { id: string; option_text: string }[]
}

interface Answer {
  question_id: string
  selected_option_ids: string[]
  answer_text: string | null
}

interface MemberInfo {
  member_counsel_id: number
  name: string
  birth_date: string
  phone: string
  gender: string
}

export default function SurveyResultMulti({
  surveyIds,
  memberCounselId,
}: SurveyResultMultiProps) {
  const supabase = getSupabaseClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<MemberInfo | null>(null)
  const [visibleSurveyIds, setVisibleSurveyIds] = useState<string[]>([])
  const [results, setResults] = useState<
    {
        survey: Survey
        questions: Question[]
        answers: Answer[]
        responseId: string 
        submittedAt: string
    }[]
    >([])

  // const toggleVisibility = (id: string) => {
  //   setVisibleSurveyIds((prev) =>
  //     prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
  //   )
  // }
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // 1. 회원정보 불러오기
        const { data: memberDataList, error: memberError } = await supabase
          .from('members_counsel')
          .select('member_counsel_id, name, birth_date, phone, gender')
          .eq('member_counsel_id', memberCounselId)

        if (memberError) throw memberError
        if (!memberDataList || memberDataList.length === 0) return
        setMember(memberDataList[0])


        // 2. 설문별 질문, 응답 불러오기
        const resultsData = []

        for (const surveyId of surveyIds) {
          // 설문 제목
          const { data: surveys, error: surveyError } = await supabase
            .from('surveys')
            .select('id, title')
            .eq('id', surveyId)
            // .single()
          if (surveyError) throw surveyError
          if (!surveys || surveys.length === 0) continue
          
          const survey = surveys[0]
          
          console.log('📌 surveyId:', surveyId)
          console.log('📋 설문:', survey)

          // 질문
          const { data: questionsData } = await supabase
            .from('survey_questions')
            .select('id, question_text, question_type')
            .eq('survey_id', surveyId)

          console.log('❓ 질문 목록:', questionsData)
        
          const questionsWithOptions = await Promise.all(
            (questionsData || []).map(async (q) => {
              const { data: options } = await supabase
                .from('survey_options')
                .select('id, option_text')
                .eq('question_id', q.id)
              return { ...q, options: options || [] }
            })
          )

          // 응답 ID
          const { data: responseList } = await supabase
            .from('survey_responses')
            .select('id, submitted_at')
            .eq('survey_id', surveyId)
            .eq('member_counsel_id', memberCounselId)
            .order('submitted_at', { ascending: false })
            .limit(1) // limit은 그대로 유지

          
          const response = responseList?.[0]
          if (!response) continue
          console.log('응답 목록:', response) 

          const responseId = response.id
          const submittedAt = response.submitted_at

          const { data: answers } = await supabase
            .from('survey_answers')
            .select('question_id, selected_option_ids, answer_text')
            .eq('response_id', responseId)

          resultsData.push({
            survey,
            questions: questionsWithOptions,
            answers: answers || [],
            responseId, 
            submittedAt,  
          })
        }

        setResults(resultsData)
      } catch (error) {
        console.error(error)
        // alert('데이터를 불러오는데 실패했습니다.')
        toast.error('데이터를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [surveyIds, memberCounselId])

  if (loading) return <p>결과 불러오는 중...</p>

  return (
    <div className="p-4 sm:p-8 lg:px-24 lg:py-12 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">회원정보</h1>
      {member && (
        <div className="bg-white rounded-xl shadow p-6 mb-12 text-gray-800 text-base space-y-2 border border-gray-200">
          <div><span className="font-semibold">이름:</span> {member.name}</div>
          <div><span className="font-semibold">생년월일:</span> {member.birth_date}</div>
          <div><span className="font-semibold">성별:</span> {member.gender}</div>
          <div><span className="font-semibold">연락처:</span> {member.phone}</div>
        </div>
      )}
  
      <h2 className="text-2xl font-semibold mb-6 text-gray-900">제출된 설문 목록</h2>
      <div className="space-y-6">
        {results.map(({ survey, questions, answers, responseId, submittedAt }) => {
          const isVisible = visibleSurveyIds.includes(survey.id)
  
          return (
            <div key={survey.id} className="border border-gray-200 rounded-xl p-6 bg-white shadow hover:shadow-md transition">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{survey.title}</p>
                  <p className="text-sm text-gray-500">
                    응답 시간: {new Date(submittedAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="darkGray"
                  className="text-sm px-4 py-1.5 rounded transition"
                  onClick={() =>
                    router.push(
                      `/survey-result?surveyID=${survey.id}&responseID=${responseId}&member_counsel_id=${memberCounselId}`
                    )
                  }
                >
                  응답 보기
                </Button>
              </div>
  
              {isVisible && (
                <div className="mt-4 space-y-5">
                  {questions.map((q) => {
                    const answer = answers.find((a) => a.question_id === q.id)
                    const selectedOptionIds = answer?.selected_option_ids || []
                    const answerText = answer?.answer_text
  
                    return (
                      <div key={q.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                        <p className="font-semibold mb-2 text-gray-800">{q.question_text}</p>
  
                        {q.question_type === 'text' && (
                          <p className="text-gray-700 whitespace-pre-line">
                            {answerText?.trim() || <span className="text-gray-400 italic">응답 없음</span>}
                          </p>
                        )}
  
                        {(q.question_type === 'single' || q.question_type === 'multiple') && (
                          <ul className="list-disc pl-5 space-y-1 text-gray-700">
                            {q.options
                              .filter((opt) => selectedOptionIds.includes(opt.id))
                              .map((opt) => (
                                <li key={opt.id}>{opt.option_text}</li>
                              ))}
  
                            {selectedOptionIds.length === 0 && (
                              <li className="text-gray-400 italic">응답 없음</li>
                            )}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
  
}
