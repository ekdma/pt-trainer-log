'use client'

import { useState } from 'react'
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

type QuestionType = 'single' | 'multiple' | 'text'

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

interface AddSurveyProps {
  open: boolean
  onClose: () => void
  onSurveyAdded?: () => void
  currentMemberId: number
}

export default function AddSurvey({
  open,
  onClose,
  onSurveyAdded,
  currentMemberId,
}: AddSurveyProps) {
  const supabase = getSupabaseClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)

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

    const { data: surveyRow, error: surveyError } = await supabase
      .from('surveys')
      .insert({
        title,
        description,
        created_by: currentMemberId,
      })
      .select('id')
      .single()

    if (surveyError) {
      toast.error('설문 생성에 실패했습니다')
      console.error(surveyError)
      setLoading(false)
      return
    }

    try {
      for (const [qIdx, q] of questions.entries()) {
        const { data: questionRow, error: questionError } = await supabase
          .from('survey_questions')
          .insert({
            survey_id: surveyRow.id,
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

      toast.success('설문이 추가되었습니다')
      onSurveyAdded?.()
      /* 폼 초기화 */
      setTitle('')
      setDescription('')
      setQuestions([])
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('질문/옵션 저장 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  /* ─────────────────────────────── UI ─────────────────────────────── */
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>설문 추가</DialogTitle>
        </DialogHeader>

        <div className="max-h-[80vh] overflow-y-auto space-y-6 p-1">
          {/* 설문 제목 / 설명 */}
          <Input
            placeholder="설문 제목"
            className="bg-white text-gray-600"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="설문 설명 (선택)"
            className="bg-white text-gray-600"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
                />
              </div>

              {/* 질문 유형 선택 */}
              <select
                className="w-full rounded border px-3 py-2 bg-white text-gray-600"
                value={q.type}
                onChange={(e) =>
                  updateQuestion(q.id, { type: e.target.value as QuestionType })
                }
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
              {loading ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
