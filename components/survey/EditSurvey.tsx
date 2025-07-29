'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'

const supabase = getSupabaseClient() 

type QuestionType = 'single' | 'multiple' | 'text'

interface Survey {
  id: string
  title: string
  description?: string
}

interface Option {
  id: string
  text: string
}

interface Question {
  id: string
  text: string
  type: QuestionType
  options: Option[]
}

interface EditSurveyProps {
  open: boolean
  onClose: () => void
  onSurveyUpdated?: () => void
  survey: Survey | null 
}

export default function EditSurvey({
  open,
  onClose,
  onSurveyUpdated,
  survey,
}: EditSurveyProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const surveyId = survey?.id

  useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setQuestions([])
      setLoading(false)
    }
  }, [open])

  // 설문, 질문, 옵션 불러오기
  useEffect(() => {
    if (!open || !surveyId) return
    let isCancelled = false

    const fetchSurvey = async () => {
      setLoading(true)

      try {
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select('title, description')
          .eq('id', surveyId)
          .single()

        if (surveyError) throw surveyError
        if (isCancelled) return

        setTitle(surveyData.title)
        setDescription(surveyData.description || '')

        const { data: questionsData, error: questionsError } = await supabase
          .from('survey_questions')
          .select('id, question_text, question_type, order')
          .eq('survey_id', surveyId)
          .order('order', { ascending: true })

        if (questionsError) throw questionsError
        if (isCancelled) return

        const questionsWithOptions = await Promise.all(
          (questionsData || []).map(async (q) => {
            if (!q) return null // 안전하게 null 처리
        
            const { data: options, error: optionsError } = await supabase
              .from('survey_options')
              .select('id, option_text, order')
              .eq('question_id', q.id)
              .order('order', { ascending: true })
        
            if (optionsError) throw optionsError
        
            return {
              id: q.id,
              text: q.question_text,
              type: q.question_type as QuestionType,
              options: options?.map((o) => ({ id: o.id, text: o.option_text })) || [],
            }
          })
        )
        
        // null or undefined 제거
        const filteredQuestions = questionsWithOptions.filter(
          (q): q is Question => q !== null && q !== undefined,
        )
        
        setQuestions(filteredQuestions)
      } catch (err) {
        console.error(err)
        toast.error('설문 데이터를 불러오는 중 오류가 발생했습니다.')
        onClose()
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }

    fetchSurvey()
    return () => {
      isCancelled = true
    }
  }, [open, surveyId])

  /* ────────────────────────── 질문/옵션 편집 헬퍼 ────────────────────────── */
  const addQuestion = () =>
    setQuestions((qs) => [
      ...qs,
      {
        id: crypto.randomUUID(),
        text: '',
        type: 'single',
        options: [{ id: crypto.randomUUID(), text: '' }],
      },
    ])

  const updateQuestion = (qid: string, patch: Partial<Question>) =>
    setQuestions((qs) =>
      qs.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
    )

  const changeOption = (qid: string, oid: string, value: string) =>
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== qid) return q
        const opts = q.options.map((o) =>
          o.id === oid ? { ...o, text: value } : o,
        )
        /* 마지막 옵션이 채워지면 새 빈 옵션 추가 */
        if (opts[opts.length - 1].id === oid && value.trim() !== '') {
          opts.push({ id: crypto.randomUUID(), text: '' })
        }
        return { ...q, options: opts }
      }),
    )

  /* ───────────────────────────── 저장 로직 ───────────────────────────── */
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요')
      return
    }
    if (
      questions.some(
        (q) =>
          !q.text.trim() ||
          (q.type !== 'text' &&
            q.options.filter((o) => o.text.trim()).length === 0),
      )
    ) {
      toast.error('모든 질문/옵션을 입력해주세요')
      return
    }

    setLoading(true)

    try {
      // 설문 제목/설명 업데이트
      const { error: surveyUpdateError } = await supabase
        .from('surveys')
        .update({
          title,
          description,
        })
        .eq('id', surveyId)

      if (surveyUpdateError) throw surveyUpdateError

      // 질문, 옵션 업데이트는 간단히 삭제 후 재삽입 방식 (복잡한 변경 처리 대신)
      // 기존 질문/옵션 삭제
      const { data: questionIds, error: questionIdsError } = await supabase
          .from('survey_questions')
          .select('id')
          .eq('survey_id', surveyId)

      if (questionIdsError) throw questionIdsError

      const ids = questionIds?.map(q => q.id) || []

      if (ids.length > 0) {
          const { error: deleteOptionsError } = await supabase
          .from('survey_options')
          .delete()
          .in('question_id', ids)
          if (deleteOptionsError) throw deleteOptionsError
      }

      const { error: deleteQuestionsError } = await supabase
          .from('survey_questions')
          .delete()
          .eq('survey_id', surveyId)
      if (deleteQuestionsError) throw deleteQuestionsError

      // 새 질문/옵션 삽입
      for (const [qIdx, q] of questions.entries()) {
        const { data: questionRow, error: questionError } = await supabase
          .from('survey_questions')
          .insert({
            survey_id: surveyId,
            question_text: q.text.trim(),
            question_type: q.type,
            order: qIdx,
          })
          .select('id')
          .single()

        if (questionError) throw questionError

        if (q.type !== 'text') {
          const optionRows = q.options
            .filter((o) => o.text.trim())
            .map((o, idx) => ({
              question_id: questionRow.id,
              option_text: o.text.trim(),
              order: idx,
            }))
          if (optionRows.length) {
            const { error: optionError } = await supabase
              .from('survey_options')
              .insert(optionRows)
            if (optionError) throw optionError
          }
        }
      }

      toast.success('설문이 수정되었습니다')
      onSurveyUpdated?.()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('설문 수정 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  /* ─────────────────────────────── UI ─────────────────────────────── */
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>설문 수정</DialogTitle>
        </DialogHeader>

        <div className="max-h-[80vh] overflow-y-auto space-y-6 p-1">
          {/* 설문 제목 / 설명 */}
          <Input
            placeholder="설문 제목"
            className="bg-white text-gray-600"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
          <Textarea
            placeholder="설문 설명 (선택)"
            className="bg-white text-gray-600"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />

          {/* 질문 목록 */}
          {questions.map((q, qIdx) => (
            <div
              key={q.id}
              className="rounded border p-4 space-y-4 bg-white text-gray-600"
            >
              {/* 질문 텍스트 */}
              <div className="flex items-start gap-2">
                <span className="pt-2 font-medium">{qIdx + 1}.</span>
                <Input
                  placeholder="질문 내용을 입력해주세요"
                  className="bg-white text-gray-600"
                  value={q.text}
                  onChange={(e) =>
                    updateQuestion(q.id, { text: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              {/* 질문 유형 선택 */}
              <select
                className="w-full rounded border px-3 py-2 bg-white text-gray-600"
                value={q.type}
                onChange={(e) =>
                  updateQuestion(q.id, { type: e.target.value as QuestionType })
                }
                disabled={loading}
              >
                <option value="single">객관식 (단일 선택)</option>
                <option value="multiple">체크박스 (복수 선택)</option>
                <option value="text">주관식</option>
              </select>

              {/* 옵션 / 주관식 미리보기 */}
              {q.type === 'text' ? (
                <Textarea
                  className="bg-white text-gray-600"
                  disabled
                  placeholder="응답자가 입력할 주관식 영역 (미리 보기)"
                />
              ) : (
                <div className="space-y-2">
                  {q.options.map((o, idx) => (
                    <div key={o.id} className="flex items-center gap-2">
                      {q.type === 'single' ? (
                        <input type="radio" disabled />
                      ) : (
                        <input type="checkbox" disabled />
                      )}
                      <Input
                        className="flex-1 bg-white text-gray-600"
                        placeholder={`옵션 ${idx + 1}`}
                        value={o.text}
                        onChange={(e) =>
                          changeOption(q.id, o.id, e.target.value)
                        }
                        disabled={loading}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* + 질문 버튼 */}
          <Button
            variant="ghost"
            className="w-full"
            onClick={addQuestion}
            disabled={loading}
          >
            + 질문
          </Button>

          {/* 저장 / 취소 */}
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              variant="ghost"
              className="text-sm"
              onClick={onClose}
              disabled={loading}
            >
              닫기
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              variant="darkGray" 
              className="text-sm"
            >
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
