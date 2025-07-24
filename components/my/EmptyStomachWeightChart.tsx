'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Line } from 'react-chartjs-2'

// Chart.js에 플러그인 등록
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartDataLabels)

interface HealthMetric {
  id: number
  member_id: number
  metric_target: string
  metric_type: string
  metric_value: number
  measure_date: string
}

export default function EmptyStomachWeightChart() {
  const supabase = getSupabaseClient()
  const [dataPoints, setDataPoints] = useState<HealthMetric[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const raw = localStorage.getItem('litpt_member')
      const member = raw ? JSON.parse(raw) : null
      if (!member) return

      const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('member_id', member.member_id)
        .eq('metric_target', 'Overall Fitness')
        .eq('metric_type', 'Empty Stomach Weight')
        .order('measure_date', { ascending: true })

      if (error) {
        console.error('Error fetching health metrics:', error)
      } else if (data) {
        const today = new Date()
        const eightDaysAgo = new Date()
        eightDaysAgo.setDate(today.getDate() - 8)

        const filtered = data.filter((item) => {
          const d = new Date(item.measure_date)
          return d >= eightDaysAgo && d <= today
        })

        setDataPoints(filtered)
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  if (loading) return <div>로딩 중...</div>
  if (dataPoints.length === 0) return <div>공복체중 데이터가 없습니다.</div>

  const labels = dataPoints.map((d) => {
    const date = new Date(d.measure_date)
    const day = date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) // ex: 7/26
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() // SAT
    return [`${day}`, `(${weekday})`]  // <- 2줄 배열로 반환
  })

  const chartData = {
    labels,
    datasets: [
      {
        label: '공복체중',
        data: dataPoints.map((d) => d.metric_value),
        borderColor: '#EF4444',
        backgroundColor: '#EF4444',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  }

  const options = {
    responsive: true,
    layout: {
        padding: {
        top: 30,  // ← 이거 추가!
        },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
      datalabels: {
        color: '#000',
        font: { weight: 'bold' as const },
        anchor: 'end' as const,
        align: 'top' as const,
        formatter: (value: number) => `${value}`,
      },
    },
    scales: {
      y: {
        display: false,
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  }

  return (
    <section className="bg-white rounded-2xl shadow p-4 border max-w-md mx-auto mb-6 h-52 md:h-60">
      <Line data={chartData} options={options} />
    </section>
  )
}