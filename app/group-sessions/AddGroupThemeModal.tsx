'use client'

import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

type Props = {
  onClose: () => void
  onThemeAdded: () => void
}

export default function AddGroupThemeModal({ onClose, onThemeAdded }: Props) {
  const supabase = getSupabaseClient()
  const [themeName, setThemeName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleAdd = async () => {
    if (!themeName.trim()) {
      setErrorMsg('테마 이름을 입력해주세요')
      return
    }

    setLoading(true)
    setErrorMsg('')

    const { error } = await supabase.from('group_theme').insert({
      theme_name: themeName,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error(error)
      setErrorMsg('테마 추가에 실패했습니다')
    } else {
      onThemeAdded()
      onClose()
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
        <h3 className="text-lg font-bold mb-3">운동 테마 추가</h3>
        {errorMsg && <p className="text-red-500 text-sm mb-2">{errorMsg}</p>}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">테마 이름</label>
          <input
            type="text"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="예: 하체 집중, 유산소+코어"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleAdd}
            disabled={loading}
            variant="outline"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition"
          >
            {loading ? '추가 중...' : '추가'}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            type="button"
            className="px-4 py-2 text-sm"
            disabled={loading}
          >
            취소
          </Button>
        </div>
      </div>
    </div>
  )
}
