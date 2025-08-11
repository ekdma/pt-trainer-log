// DeleteSession.tsx
'use client'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/LanguageContext'

interface DeleteSessionProps {
  date: string
  time: string
  sessionType: string
  reason: string
  setReason: (val: string) => void
  onCancel: () => void
  onClose: () => void
}

export default function DeleteSession({
  date,
  time,
  sessionType,
  reason,
  setReason,
  onCancel,
  onClose,
}: DeleteSessionProps) {
  const { t } = useLanguage()

  return (
    <>
      {/* 배경 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="fixed z-50 top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* 헤더 */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800">
              {date} · {time} ·{' '}
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
                {sessionType}
              </span>
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('my_calendar.cancelSessionQ')}
            </p>
          </div>

          {/* 본문 */}
          <div className="px-6 py-5">
            <textarea
              rows={2}
              className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 resize-none placeholder-gray-400"
              // placeholder={t('my_calendar.enterReason') || '취소 사유를 입력하세요...'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* 푸터 */}
          <div className="px-6 py-4 flex justify-end gap-3 bg-gray-50 border-t border-gray-100">
            <Button
              variant="ghost"
              className="text-sm"
              onClick={onClose}
            >
              {t('master.close')}
            </Button>
            <Button
              onClick={onCancel}
              variant="darkGray"
              className="text-sm"
            >
              {t('master.yesCancel')}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
