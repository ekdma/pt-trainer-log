'use client'

import { useEffect, useState } from 'react'
import { NewHealthMetric, Member } from './types'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase'
import { Disclosure } from '@headlessui/react'
import { ChevronUpIcon } from '@heroicons/react/20/solid'

type Props = {
  member: Member
  onCancel: () => void
  onSave: (record: NewHealthMetric) => void
  isOpen: boolean
}

type HealthMetricType = {
  health_metric_type_id: number
  metric_target: string
  metric_type: string
}

export default function AddHealthMetricOpen({ member, onCancel, onSave, isOpen }: Props) {
  const [value, setValue] = useState<number | ''>('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [allMetrics, setAllMetrics] = useState<HealthMetricType[]>([])
  const [selectedTarget, setSelectedTarget] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newType, setNewType] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = getSupabaseClient()

  useEffect(() => {
    if (isOpen) fetchMetrics()
  }, [isOpen])

  const fetchMetrics = async () => {
    const { data, error } = await supabase
      .from('health_metric_types')
      .select('*')
      .order('metric_target', { ascending: true })

    if (error) {
      console.error('❌ 건강 측정 항목 불러오기 실패:', error)
    } else {
      setAllMetrics(data || [])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTarget || !selectedType || value === '' || !date) {
      alert('모든 필드를 입력해주세요.')
      return
    }

    const record: NewHealthMetric = {
      member_id: member.member_id,
      metric_target: selectedTarget,
      metric_type: selectedType,
      metric_value: typeof value === 'number' ? value : parseFloat(value),
      measure_date: date,
    }

    onSave(record)

    // 폼 초기화
    setSelectedTarget('')
    setSelectedType('')
    setValue('')
    setDate(new Date().toISOString().slice(0, 10))
    onCancel()
  }

  const handleAddMetric = async () => {
    if (!newTarget || !newType) {
      alert('추가할 분류 및 항목을 입력해주세요.')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('health_metric_types').insert({
      metric_target: newTarget,
      metric_type: newType,
    })

    if (error) {
      alert('추가 실패: ' + error.message)
    } else {
      await fetchMetrics()
      setNewTarget('')
      setNewType('')
    }
    setLoading(false)
  }

  const handleDeleteMetric = async (health_metric_type_id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { error } = await supabase.from('health_metric_types').delete().eq('health_metric_type_id', health_metric_type_id)
    if (error) {
      alert('삭제 실패: ' + error.message)
    } else {
      await fetchMetrics()
    }
  }

  const uniqueTargets = Array.from(new Set(allMetrics.map((m) => m.metric_target)))
  const metricTypesForTarget = allMetrics.filter((m) => m.metric_target === selectedTarget)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-md p-6 space-y-5 relative"
      >
        <h3 className="text-xl font-bold text-indigo-600 border-b pb-2">건강 기록 추가</h3>

        <div className="space-y-3">
          {/* 회원 이름 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">회원 이름</label>
            <input
              type="text"
              value={member.name}
              readOnly
              className="w-full bg-gray-100 border rounded-lg px-3 py-2 text-gray-700 text-sm"
            />
          </div>

          {/* 분류 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">분류</label>
            <select
              value={selectedTarget}
              onChange={(e) => {
                setSelectedTarget(e.target.value)
                setSelectedType('')
              }}
              className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">선택하세요</option>
              {uniqueTargets.map((target) => (
                <option key={target} value={target}>
                  {target}
                </option>
              ))}
            </select>
          </div>

          {/* 항목 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">항목</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              disabled={!selectedTarget}
              className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">선택하세요</option>
              {metricTypesForTarget.map((m) => (
                <option key={m.health_metric_type_id} value={m.metric_type}>
                  {m.metric_type}
                </option>
              ))}
            </select>
          </div>

          {/* 측정값 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">측정값</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="예: 70.5"
              className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* 날짜 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="text-sm">
            취소
          </Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
            저장
          </Button>
        </div>

        {/* 아코디언: 항목 관리 */}
        <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button className="flex w-full justify-between items-center mt-6 text-sm font-medium text-indigo-600 hover:underline">
                <span>측정 항목 추가/삭제</span>
                <ChevronUpIcon
                  className={`h-5 w-5 transform transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </Disclosure.Button>
              <Disclosure.Panel className="mt-2 bg-gray-50 border rounded-lg shadow-inner p-4 text-sm space-y-3 text-gray-500">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    placeholder="분류"
                    className="flex-1 border px-2 py-1 rounded"
                  />
                  <input
                    type="text"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    placeholder="항목"
                    className="flex-1 border px-2 py-1 rounded"
                  />
                  <button
                    type="button"
                    onClick={handleAddMetric}
                    disabled={loading}
                    className="text-indigo-500 hover:underline"
                  >
                    저장
                  </button>
                </div>
                <ul className="max-h-40 overflow-y-auto border-t pt-2 space-y-1">
                  {allMetrics.map((m) => (
                    <li key={m.health_metric_type_id} className="flex justify-between items-center border-b py-1 text-gray-700">
                      <span>{m.metric_target} / {m.metric_type}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteMetric(m.health_metric_type_id)}
                        className="text-red-500 hover:underline"
                      >
                        삭제
                      </button>
                    </li>
                  ))}
                </ul>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>
      </form>
    </div>
  )
}
