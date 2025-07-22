'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface HealthMetricType {
  health_metric_type_id: number
  metric_target: string
  metric_type: string
  order_target: number
  order_type: number
}

interface AddHealthMetricProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allTypes: HealthMetricType[]
  newTarget: string
  newWorkout: string
  loading: boolean
  onChangeTarget: (val: string) => void
  onChangeWorkout: (val: string) => void
  onAdd: () => void
  onDelete: (id: number) => void
}

export default function AddHealthMetric({
  open,
  onOpenChange,
  allTypes,
  newTarget,
  newWorkout,
  loading,
  onChangeTarget,
  onChangeWorkout,
  onAdd,
  onDelete,
}: AddHealthMetricProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">측정 항목 추가/삭제</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1.5fr_1fr] gap-4 items-end mt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">분류 (Target)</label>
            <input
              type="text"
              value={newTarget}
              onChange={(e) => onChangeTarget(e.target.value)}
              placeholder="예: Body Composition"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">항목 (Type)</label>
            <input
              type="text"
              value={newWorkout}
              onChange={(e) => onChangeWorkout(e.target.value)}
              placeholder="예: Weight"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div className="self-stretch flex items-end">
            {/* <button
              type="button"
              onClick={onAdd}
              disabled={loading}
              className="w-full bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-50"
            >
              추가
            </button> */}
            <Button
              onClick={onAdd}
              disabled={loading}
              variant="darkGray" 
              className="text-sm"
            >
              추가
            </Button>
          </div>
        </div>

        <ul className="max-h-40 overflow-y-auto border-t pt-3 mt-4 space-y-1 text-sm text-gray-700">
          {[...allTypes]
            .sort((a, b) => {
              if (a.order_target !== b.order_target) return a.order_target - b.order_target
              return a.order_type - b.order_type
            })
            .map((m) => (
              <li
                key={m.health_metric_type_id}
                className="flex justify-between items-center border-b py-1 px-1"
              >
                <span>{m.metric_target} / {m.metric_type}</span>
                <button
                  type="button"
                  onClick={() => onDelete(m.health_metric_type_id)}
                  className="text-red-500 hover:underline text-xs"
                >
                  삭제
                </button>
              </li>
          ))}
        </ul>

        {/* <div className="text-right mt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </div> */}
      </DialogContent>
    </Dialog>
  )
}
