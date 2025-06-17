import React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/cn"

type Props = {
  id: string
  text: string
  disabled?: boolean
}

const SortableItem = ({ id, text, disabled = false }: Props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "flex items-center gap-2 px-4 py-2 border rounded bg-white shadow-sm text-sm",
        isDragging && "opacity-50 bg-gray-100"
      )}
    >
      <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
      <span>{text}</span>
    </div>
  )
}

export default SortableItem
