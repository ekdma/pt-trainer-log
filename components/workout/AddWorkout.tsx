'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface WorkoutType {
  workout_type_id: number
  target: string
  workout: string
  level: string
  order_target: number
  order_workout: number
}

interface AddWorkoutProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allTypes: WorkoutType[]
  newTarget: string
  setNewTarget: (value: string) => void
  newWorkout: string
  setNewWorkout: (value: string) => void
  newLevel: string
  setNewLevel: (value: string) => void
  handleAddType: () => void
  handleDeleteType: (id: number) => void
  loadingManage: boolean
}

export default function AddWorkout({
  open,
  onOpenChange,
  allTypes,
  newTarget,
  setNewTarget,
  newWorkout,
  setNewWorkout,
  newLevel,
  setNewLevel,
  handleAddType,
  handleDeleteType,
  loadingManage,
}: AddWorkoutProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-indigo-600">측정 항목 추가/삭제</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1.5fr_1fr_auto] gap-4 items-end mt-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">분류 (Target)</label>
            <input
              type="text"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              placeholder="예: Leg"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">항목 (Workout)</label>
            <input
              type="text"
              value={newWorkout}
              onChange={(e) => setNewWorkout(e.target.value)}
              placeholder="예: Squat"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">난이도 (Level)</label>
            <select
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">선택</option>
              <option value="Level 1">Level 1</option>
              <option value="Level 2">Level 2</option>
              <option value="Level 3">Level 3</option>
              <option value="Level 4">Level 4</option>
              <option value="Level 5">Level 5</option>
            </select>
          </div>

          <div className="self-stretch flex items-end">
            <button
              type="button"
              onClick={handleAddType}
              disabled={loadingManage}
              className="w-full bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-50"
            >
              추가
            </button>
          </div>
        </div>

        <ul className="mt-6 max-h-40 overflow-y-auto border-t pt-3 space-y-1 text-sm text-gray-700">
          {[...allTypes]
            .filter((m) => m.level !== 'GROUP')
            .sort((a, b) => {
              if (a.level !== b.level) return a.level.localeCompare(b.level)
              if (a.order_target !== b.order_target) return a.order_target - b.order_target
              return a.order_workout - b.order_workout
            })
            .map((m) => (
              <li
                key={m.workout_type_id}
                className="flex justify-between items-center border-b py-1 px-1"
              >
                <span>{m.target} / {m.workout} / {m.level}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteType(m.workout_type_id)}
                  className="text-red-500 hover:underline text-xs"
                >
                  삭제
                </button>
              </li>
            ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
