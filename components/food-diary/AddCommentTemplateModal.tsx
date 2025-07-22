'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { getSupabaseClient } from '@/lib/supabase'
import { X } from 'lucide-react'

interface AddCommentTemplateModalProps {
  onTemplateAdded: (text: string) => void
  onTemplateDeleted?: (text: string) => void
}

export default function AddCommentTemplateModal({ onTemplateAdded, onTemplateDeleted }: AddCommentTemplateModalProps) {
  const supabase = getSupabaseClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTemplateText, setNewTemplateText] = useState('')
  const [templateList, setTemplateList] = useState<string[]>([])

  // 템플릿 목록 불러오기
  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('food_comment_templates')
      .select('content')
      .order('content', { ascending: true })

    if (!error && data) {
      setTemplateList(data.map(item => item.content))
    }
  }

  // 저장
  const handleSave = async () => {
    const text = newTemplateText.trim()
    if (!text || templateList.includes(text)) {
        alert('이미 존재하는 템플릿입니다')
        return
    }

    const { error } = await supabase.from('food_comment_templates').insert({
      meal_type: 'common',
      content: text,
    })

    if (!error) {
      onTemplateAdded(text)
      setTemplateList(prev => [...prev, text].sort((a, b) => a.localeCompare(b)))
      setNewTemplateText('')
    }
  }

  // 삭제
  const handleDelete = async (text: string) => {
    const { error } = await supabase
      .from('food_comment_templates')
      .delete()
      .eq('content', text)
      .eq('meal_type', 'common')

    if (!error) {
      onTemplateDeleted?.(text)
      setTemplateList(prev => prev.filter(t => t !== text))
    }
  }

  useEffect(() => {
    if (dialogOpen) {
      fetchTemplates()
    }
  }, [dialogOpen])

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <button className="text-sm text-gray-600 hover:text-rose-600">
          + 코멘트
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>코멘트 템플릿 관리</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <input
            className="border border-gray-300 p-2 rounded w-full text-sm"
            value={newTemplateText}
            placeholder="새 템플릿 입력"
            onChange={(e) => setNewTemplateText(e.target.value)}
          />

          <div className="max-h-40 overflow-y-auto mt-2">
            {templateList.length === 0 ? (
              <p className="text-sm text-gray-400">등록된 코멘트가 없습니다.</p>
            ) : (
              templateList.map((text) => (
                <div key={text} className="flex items-center justify-between border rounded px-3 py-1 mb-1 text-sm">
                  <span>{text}</span>
                  <button
                    onClick={() => handleDelete(text)}
                    className="text-gray-400 hover:text-rose-500"
                    title="삭제"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button 
              variant="ghost"
              className="text-sm"
            >
              닫기
            </Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            variant="darkGray" 
            className="text-sm"
            // className="bg-rose-600 hover:bg-rose-700 text-white text-sm"
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
