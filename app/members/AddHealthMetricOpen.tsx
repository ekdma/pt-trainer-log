'use client'

import { useState } from 'react'
import { NewHealthMetric, Member } from './types'
import { Button } from '@/components/ui/button'

type Props = {
  member: Member
  onCancel: () => void
  onSave: (record: NewHealthMetric) => void
  isOpen: boolean
}

export default function AddHealthMetricOpen({ member, onCancel, onSave, isOpen }: Props) {
  const [target, setTarget] = useState('')
  const [metricType, setMetricType] = useState('')
  const [value, setValue] = useState<number | ''>('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!target || !metricType || value === '' || !date) {
      alert('모든 필드를 입력해주세요.')
      return
    }

    const record: NewHealthMetric = {
      member_id: member.member_id,
      metric_target: target,
      metric_type: metricType,
      metric_value: typeof value === 'number' ? value : parseFloat(value),
      measure_date: date,
    }

    console.log('📤 저장할 건강 기록:', record)
    onSave(record)

    // 폼 초기화
    setTarget('')
    setMetricType('')
    setValue('')
    setDate(new Date().toISOString().slice(0, 10))

    onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5 border border-gray-100"
      >
        <h3 className="text-xl font-bold text-indigo-600 border-b pb-2">건강 기록 추가</h3>

        {/* 이름 표시 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">회원 이름</label>
          <input
            type="text"
            value={member.name}
            readOnly
            className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-700 cursor-not-allowed"
          />
        </div>

        {/* 부위 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">측정 부위</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="예: Body Composition, HP&BP, Overall Fitness 등"
            className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* 측정 항목 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">측정 항목</label>
          <input
            type="text"
            value={metricType}
            onChange={(e) => setMetricType(e.target.value)}
            placeholder="예: Weight, Body Fat Mass"
            className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* 값 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">측정값</label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="예: 70.5"
            className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* 날짜 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="text-gray-700">
            취소
          </Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
            저장
          </Button>
        </div>
      </form>
    </div>
  )
}
