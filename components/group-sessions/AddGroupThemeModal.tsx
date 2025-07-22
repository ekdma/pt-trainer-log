'use client'

import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  open: boolean
  onClose: () => void
  onThemeAdded: () => void
}

export default function AddGroupThemeModal({ open, onClose, onThemeAdded }: Props) {
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>운동 테마 추가</DialogTitle>
        </DialogHeader>

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

        <DialogFooter>
          <Button 
            variant="ghost"
            className="text-sm"
            onClick={onClose}
            disabled={loading}
          >
            닫기
          </Button>
          <Button
            onClick={handleAdd}
            disabled={loading}
            variant="darkGray" 
            className="text-sm"
          >
            {loading ? '저장 중...' : '저장'}
          </Button>
          {/* <Button
            onClick={handleAdd}
            disabled={loading}
            variant="save"
          >
            {loading ? '추가 중...' : '추가'}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            disabled={loading}
          >
            취소
          </Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
