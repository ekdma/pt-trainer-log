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

interface AddHashTagTemplateModalProps {
  trainerId: string
  onTemplateAdded: (tag: string) => void
  onTemplateDeleted?: (tag: string) => void
}

export default function AddHashTagTemplateModal({
  trainerId,
  onTemplateAdded,
  onTemplateDeleted,
}: AddHashTagTemplateModalProps) {
  const supabase = getSupabaseClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTagText, setNewTagText] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [tagList, setTagList] = useState<{ hashtag_content: string; description: string | null }[]>([])

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('food_hashtag_templates')
      .select('hashtag_content, description')
      .eq('trainer_id', trainerId)
      .eq('meal_type', 'common')
      .order('hashtag_content', { ascending: true })
  
    if (!error && data) {
      setTagList(data)
    }
  }

  const handleSave = async () => {
    const tag = newTagText.trim()
    const desc = newDescription.trim()
    if (!tag) {
      alert('해시태그를 입력해주세요')
      return
    }
    if (tagList.some(t => t.hashtag_content === tag)) {
      alert('이미 존재하는 해시태그입니다')
      return
    }

    const { data, error } = await supabase
      .from('food_hashtag_templates')
      .insert([
        {
          trainer_id: trainerId,
          meal_type: 'common',
          hashtag_content: tag,
          description: desc,  // 서술어 저장
        },
      ])
      .select()

    if (error) {
      console.error('해시태그 저장 오류:', error)
      alert(`저장에 실패했습니다. 에러: ${error.message}`)
      return
    }

    if (data) {
      const newItem = data[0]
      onTemplateAdded(tag)
      setTagList((prev) =>
        [...prev, newItem].sort((a, b) => a.hashtag_content.localeCompare(b.hashtag_content))
      )
      setNewTagText('')
      setNewDescription('')
    }
  }

  const handleDelete = async (tag: string) => {
    const { error } = await supabase
      .from('food_hashtag_templates')
      .delete()
      .eq('trainer_id', trainerId)
      .eq('meal_type', 'common')
      .eq('hashtag_content', tag)

    if (!error) {
      onTemplateDeleted?.(tag)
      setTagList((prev) => prev.filter((t) => t.hashtag_content !== tag))
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
          + 해시태그
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>해시태그 템플릿 관리</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              className="border border-gray-300 p-2 rounded w-1/2 text-sm"
              value={newTagText}
              placeholder="예: #단백질보충"
              onChange={(e) => setNewTagText(e.target.value)}
            />
            <input
              className="border border-gray-300 p-2 rounded w-1/2 text-sm"
              value={newDescription}
              placeholder="서술어 입력 (예: 챙겨먹기)"
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>

          <div className="max-h-40 overflow-y-auto mt-2">
            {tagList.length === 0 ? (
              <p className="text-sm text-gray-400">등록된 해시태그가 없습니다.</p>
            ) : (
              tagList.map(({ hashtag_content, description }) => (
                <div
                  key={hashtag_content}
                  className="flex items-center justify-between border rounded px-3 py-1 mb-1 text-sm"
                >
                  <span className="flex items-center gap-1">
                    <span className="font-medium">{hashtag_content}</span>
                    {description && <span className="text-gray-500 text-sm">{description}</span>}
                  </span>
                  <button
                    onClick={() => handleDelete(hashtag_content)}
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
