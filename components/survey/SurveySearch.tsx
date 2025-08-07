'use client'

import { Button } from '@/components/ui/button'
import { Edit, Trash2 } from 'lucide-react'

interface Survey {
  id: string
  title: string
  description?: string
  created_at: string
}

interface SurveySearchProps {
  surveys: Survey[]
  onClickSurvey: (id: string) => void
  onEditSurvey: (survey: Survey) => void
  onDeleteSurvey: (survey: Survey) => void 
}


export default function SurveySearch({
  surveys,
  onClickSurvey,
  onEditSurvey,
  onDeleteSurvey,
}: SurveySearchProps) {
  if (!surveys || surveys.length === 0) {
    return <p className="text-gray-500 text-sm">등록된 설문이 없습니다.</p>
  }

  return (
    <div className="flex flex-col items-center justify-center text-center bg-slate-50 py-8 px-4">
      <ul className="space-y-4 w-full max-w-3xl mx-auto">
        {surveys.map((survey) => (
          <li
            key={survey.id}
            className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm hover:shadow-md transition duration-300 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div
              className="cursor-pointer flex-1"
              onClick={() => onClickSurvey(survey.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onClickSurvey(survey.id)
              }}
            >
              <h3 className="text-gray-800 font-bold text-lg">{survey.title}</h3>
              {survey.description && (
                <p className="text-sm text-left text-gray-600 mt-1 whitespace-pre-line">{survey.description}</p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                생성일: {new Date(survey.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => onEditSurvey(survey)}
                title="설문 수정"
                className="font-semibold bg-white border border-transparent text-indigo-700 hover:bg-indigo-300 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
              >
                <Edit size={16} />
                수정
              </Button>
              <Button
                onClick={() => onDeleteSurvey(survey)}
                variant="ghost"
                className="font-semibold bg-white border border-transparent text-red-600 hover:bg-red-100 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
                title="설문 삭제"
              >
                <Trash2 size={16} />
                삭제
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
