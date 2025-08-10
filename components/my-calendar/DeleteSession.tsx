// DeleteSession.tsx
'use client'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/LanguageContext'

interface DeleteSessionProps {
  time: string
  reason: string
  setReason: (val: string) => void
  onCancel: () => void
  onClose: () => void
}

export default function DeleteSession({
  time,
  reason,
  setReason,
  onCancel,
  onClose,
}: DeleteSessionProps) {
  const { t } = useLanguage()  // 번역 함수 가져오기

  return (
    <>
      {/* 배경 반투명 */}
      <div className="fixed inset-0 bg-black bg-opacity-40 z-50" onClick={onClose} />
      
      {/* 모달 박스 */}
      <div className="fixed z-50 top-1/2 left-1/2 max-w-md w-full -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg">
        {/* <h3 className="font-semibold mb-4">{time} 세션 취소 사유를 입력해주세요:</h3> */}
        <h3 className="font-semibold mb-4">{time} {t('my_calendar.cancelSessionQ')}:</h3>
        <textarea
          rows={4}
          className="text-sm w-full p-2 border rounded resize-none"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-3">
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
    </>
  )
}
