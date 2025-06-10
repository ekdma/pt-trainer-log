'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

type Member = {
  member_id: number
  name: string
  // 필요하면 추가 필드
}

type HealthMetric = {
  health_id: number
  member_id: number
  measure_date: string
  metric_target: string
  metric_type: string
  metric_value: number
}

interface HealthMetricManagerProps {
  member: Member
  logs: HealthMetric[]
  onClose?: () => void
  onUpdateLogs?: (updatedLogs: HealthMetric[]) => void
}

export default function HealthMetricManager({
  member,
//   logs,
  onClose,
  onUpdateLogs,
}: HealthMetricManagerProps) {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([])
  const [newMetric, setNewMetric] = useState<Partial<HealthMetric>>({
    member_id: member.member_id,
  })
  const supabase = getSupabaseClient()

  const fetchMetrics = async () => {
    const { data, error } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('member_id', member.member_id)
      .order('measure_date', { ascending: true })

    if (error) {
      alert('불러오기 오류: ' + error.message)
      return []
    } else {
      setHealthMetrics(data ?? [])
      return data ?? []
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [member.member_id])

  const handleUpdate = async (metric: HealthMetric) => {
    const { error } = await supabase
      .from('health_metrics')
      .update({
        measure_date: metric.measure_date,
        metric_target: metric.metric_target,
        metric_type: metric.metric_type,
        metric_value: metric.metric_value,
      })
      .eq('health_id', metric.health_id)

    if (error) alert('수정 오류: ' + error.message)
    else {
      const updated = await fetchMetrics()
      onUpdateLogs && onUpdateLogs(updated)
      alert('기록 수정을 완료하였습니다 😊')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { error } = await supabase.from('health_metrics').delete().eq('health_id', id)
    if (error) alert('삭제 오류: ' + error.message)
    else {
      const updated = await fetchMetrics()
      onUpdateLogs && onUpdateLogs(updated)
      alert('기록 삭제를 완료하였습니다 😊')
    }
  }

  const handleInsert = async () => {
    if (
      newMetric.member_id === undefined ||
      newMetric.member_id === null ||
      !newMetric.measure_date ||
      !newMetric.metric_target ||
      !newMetric.metric_type ||
      newMetric.metric_value === undefined
    ) {
      alert('모든 필드를 입력하세요')
      return
    }

    const { error } = await supabase.from('health_metrics').insert(newMetric)
    if (error) alert('추가 오류: ' + error.message)
    else {
      setNewMetric({ member_id: member.member_id })
      const updated = await fetchMetrics()
      onUpdateLogs && onUpdateLogs(updated)
      alert('기록 저장을 완료하였습니다 😊')
    }
  }

  const handleChange = (
    id: number,
    field: keyof HealthMetric,
    value: string | number
  ) => {
    setHealthMetrics((prev) =>
      prev.map((metric) => (metric.health_id === id ? { ...metric, [field]: value } : metric))
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div
        className="relative bg-white rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] overflow-auto p-6 text-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-700 mb-4">건강지표 기록 관리</h2>

        <table className="w-full table-fixed border text-sm text-gray-600">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="border px-2 py-1">측정일</th>
              <th className="border px-2 py-1">회원명</th>
              <th className="border px-2 py-1">지표 대상</th>
              <th className="border px-2 py-1">지표 유형</th>
              <th className="border px-2 py-1">값</th>
              <th className="border px-2 py-1">동작</th>
            </tr>
          </thead>
          <tbody>
            {healthMetrics.map((metric) => (
              <tr key={metric.health_id} className="text-gray-700">
                <td className="border px-2 py-1">
                  <input
                    type="date"
                    value={metric.measure_date}
                    onChange={(e) => handleChange(metric.health_id, 'measure_date', e.target.value)}
                    className="w-full text-gray-700"
                  />
                </td>
                <td className="border px-2 py-1">{member.name}</td>
                <td className="border px-2 py-1">
                  <input
                    type="text"
                    value={metric.metric_target}
                    onChange={(e) => handleChange(metric.health_id, 'metric_target', e.target.value)}
                    className="w-full text-gray-700"
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="text"
                    value={metric.metric_type}
                    onChange={(e) => handleChange(metric.health_id, 'metric_type', e.target.value)}
                    className="w-full text-gray-700"
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="number"
                    value={metric.metric_value}
                    onChange={(e) => handleChange(metric.health_id, 'metric_value', Number(e.target.value))}
                    className="w-full text-gray-700"
                  />
                </td>
                <td className="border px-2 py-1 flex gap-2 justify-center">
                  <Button
                    size="sm"
                    className="bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
                    onClick={() => handleUpdate(metric)}
                  >
                    저장
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="bg-red-600 text-white hover:bg-red-700 text-sm"
                    onClick={() => handleDelete(metric.health_id)}
                  >
                    삭제
                  </Button>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 text-gray-700">
              <td className="border px-2 py-1">
                <input
                  type="date"
                  value={newMetric.measure_date || ''}
                  onChange={(e) => setNewMetric({ ...newMetric, measure_date: e.target.value })}
                  className="w-full text-gray-700"
                />
              </td>
              <td className="border px-2 py-1">{member.name}</td>
              <td className="border px-2 py-1">
                <input
                  type="text"
                  value={newMetric.metric_target || ''}
                  onChange={(e) => setNewMetric({ ...newMetric, metric_target: e.target.value })}
                  className="w-full text-gray-700"
                />
              </td>
              <td className="border px-2 py-1">
                <input
                  type="text"
                  value={newMetric.metric_type || ''}
                  onChange={(e) => setNewMetric({ ...newMetric, metric_type: e.target.value })}
                  className="w-full text-gray-700"
                />
              </td>
              <td className="border px-2 py-1">
                <input
                  type="number"
                  value={newMetric.metric_value || ''}
                  onChange={(e) => setNewMetric({ ...newMetric, metric_value: Number(e.target.value) })}
                  className="w-full text-gray-700"
                />
              </td>
              <td className="border px-2 py-1 text-center">
                <Button
                  size="sm"
                  className="bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
                  onClick={handleInsert}
                >
                  추가
                </Button>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 text-right">
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
