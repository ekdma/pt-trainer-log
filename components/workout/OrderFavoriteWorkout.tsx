'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { DndContext, closestCenter } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MdDragHandle } from 'react-icons/md'

interface FavoriteWorkout {
  id: number
  target: string
  workout: string
  order: number
}

export default function OrderFavoriteWorkout({
  memberId,
  onClose,
}: {
  memberId: number
  onClose: () => void
}) {
  const supabase = getSupabaseClient()
  const [items, setItems] = useState<FavoriteWorkout[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('member_id', memberId)
        .order('order', { ascending: true })

      if (!error && data) setItems(data)
    }
    fetchData()
  }, [memberId])

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      setItems((prev) => arrayMove(prev, oldIndex, newIndex))
    }
  }

  const saveOrder = async () => {
    setSaving(true)
    for (let i = 0; i < items.length; i++) {
      await supabase
        .from('favorites')
        .update({ order: i })
        .eq('id', items[i].id)
    }
    setSaving(false)
    alert('순서를 저장했어요 😊')
    onClose()
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-md max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-4">즐겨찾기 운동 순서</h2>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {items.map((item) => (
              <SortableItem key={item.id} item={item} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="flex justify-end gap-2 mt-6">
        <Button 
          variant="ghost"
          className="text-sm"
          onClick={onClose}
        >
          닫기
        </Button>
        <Button
          onClick={saveOrder}
          disabled={saving}
          variant="darkGray" 
          className="text-sm"
        >
          {saving ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  )
}

function SortableItem({ item }: { item: FavoriteWorkout }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="bg-gray-100 p-3 rounded-md flex items-center justify-between"
    >
      <div className="text-sm font-medium">{item.target} - {item.workout}</div>
      <button {...attributes} {...listeners}>
        <MdDragHandle className="text-xl text-gray-500" />
      </button>
    </li>
  )
}
