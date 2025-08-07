// components/ui/ConfirmDeleteItem.tsx
import { Button } from './button'

interface ConfirmDeleteItemProps {
  title: string | React.ReactNode
  description?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDeleteItem({
  title,
  description,
  onConfirm,
  onCancel,
}: ConfirmDeleteItemProps) {
  return (
    <div className="p-4 bg-white rounded-xl shadow-lg border w-[90vw] max-w-sm space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      {description && <p className="text-sm text-gray-600">{description}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} className="text-sm">
          닫기
        </Button>
        <Button variant="destructive" onClick={onConfirm} className="text-sm">
          삭제
        </Button>
      </div>
    </div>
  )
}
