'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { getSupabaseClient } from '@/lib/supabase'

interface Survey {
  id: string
  title: string
}

interface Props {
  open: boolean
  onClose: () => void
  onStart: (selectedSurveyIds: string[], mode: 'existing' | 'new') => void
}

export default function SurveyResponseMulti({ open, onClose, onStart }: Props) {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedSurveys, setSelectedSurveys] = useState<string[]>([])
  const [mode, setMode] = useState<'existing' | 'new' | null>(null)

  const supabase = getSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    const fetchSurveys = async () => {
      const { data, error } = await supabase.from('surveys').select('id, title')
      if (!error && data) setSurveys(data)
    }
    if (open) fetchSurveys()
  }, [open])

  const toggleSurvey = (id: string) => {
    setSelectedSurveys((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const handleStart = () => {
    if (selectedSurveys.length === 0 || !mode) return

    if (mode === 'new') {
      const query = selectedSurveys.map((id) => `surveyID=${encodeURIComponent(id)}`).join('&')
      router.push(`/survey-response?${query}`)
      onClose()
      return
    }

    onStart(selectedSurveys, mode)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg px-6 py-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-gray-900">설문 시작</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 설문 선택 영역 */}
          <fieldset className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
            <legend className="font-semibold mb-2">진행할 설문 선택 (다중선택)</legend>
            <div className="flex flex-col gap-2">
              {surveys.length > 0 ? (
                surveys.map((survey) => (
                  <label
                    key={survey.id}
                    className="inline-flex items-center cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSurveys.includes(survey.id)}
                      onChange={() => toggleSurvey(survey.id)}
                      className="mr-2"
                    />
                    {survey.title}
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-400">등록된 설문이 없습니다.</p>
              )}
            </div>
          </fieldset>

          {/* 대상 선택 영역 */}
          <fieldset className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
            <legend className="font-semibold mb-2">대상 선택</legend>
          {/* <div className="border border-gray-200 rounded-lg p-4 bg-gray-50"> */}
            {/* <h3 className="text-sm font-semibold text-gray-700 mb-3">대상 선택</h3> */}
            <div className="flex gap-3">
              <Button
                variant={mode === 'existing' ? 'lightGray' : 'outline'}
                className="flex-1 text-sm"
                onClick={() => setMode('existing')}
              >
                기존 회원
              </Button>
              <Button
                variant={mode === 'new' ? 'lightGray' : 'outline'}
                className="flex-1 text-sm"
                onClick={() => setMode('new')}
              >
                신규 상담회원
              </Button>
            </div>
          </fieldset>

          {/* 하단 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
            <Button 
              variant="ghost"
              className="text-sm"
              onClick={onClose}
            >
              닫기
            </Button>
            <Button
              onClick={handleStart}
              variant="darkGray" 
              className="text-sm"
            >
              설문 시작
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
