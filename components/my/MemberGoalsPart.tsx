'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

interface DietGoal {
  meals_per_day: number
  important_meal: string
  finish_by_hour: number
  custom?: string
  hashtags?: string[]
}

interface HydrationGoal {
  cups_per_day: number
}

interface SleepGoal {
  hours_per_day: number
}

interface BodyGoal {
  muscle_gain_kg: number
  fat_loss_kg: number
}

interface MemberGoals {
  diet?: DietGoal
  hydration?: HydrationGoal
  sleep?: SleepGoal
  body?: BodyGoal
}

interface HashtagTemplate {
  id: number
  hashtag_content: string
  description?: string
}

export default function MemberGoalsPart() {
  const supabase = getSupabaseClient()
  const [goals, setGoals] = useState<MemberGoals>({})
  const [templates, setTemplates] = useState<HashtagTemplate[]>([])
  const latestGoals: MemberGoals = {}
  const [hashtagCounts, setHashtagCounts] = useState<Record<string, number>>({})

  const fetchGoals = async () => {
    const raw = localStorage.getItem('litpt_member')
    const member = raw ? JSON.parse(raw) : null
    if (!member) return

    const { data, error } = await supabase
      .from('member_goals')
      .select('*')
      .eq('member_id', member.member_id)
      .order('created_at', { ascending: false })

    if (error || !data) return

    const validGoalTypes = ['diet', 'hydration', 'sleep', 'body'] as const
    type GoalType = typeof validGoalTypes[number]

    for (const goal of data) {
      const type = goal.goal_type as string
      if (validGoalTypes.includes(type as GoalType)) {
        const typedType = type as GoalType
        if (!latestGoals[typedType]) {
          latestGoals[typedType] = goal.content
        }
      }
    }
    setGoals(latestGoals)
  }

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('food_hashtag_templates')
      .select('*')

    if (!error && data) {
      setTemplates(data)
    }
  }

  const fetchHashtagCounts = async (memberId: string, hashtags: string[]) => {
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 7)
    const { data, error } = await supabase
      .from('food_hashtags')
      .select('hashtags')
      .eq('member_id', memberId)
      .gte('created_at', fromDate.toISOString())

    if (error || !data) return

    // hashtags 컬럼은 객체 형태 (예: {"Lunch": ["#단백질보충", "#저칼로리"], ...})
    // 모든 배열을 합쳐서 하나의 배열로 만들기
    const allHashtags: string[] = []
    data.forEach(row => {
      const obj = row.hashtags || {}
      Object.values(obj).forEach(value => {
        if (Array.isArray(value)) {
          allHashtags.push(...(value as string[]))
        }
      })
    })

    // 관심있는 해시태그별 카운트 계산
    const counts: Record<string, number> = {}
    hashtags.forEach(tag => {
      counts[tag] = allHashtags.filter(h => h === tag).length
    })
    setHashtagCounts(counts)
  }

  useEffect(() => {
    fetchGoals()
    fetchTemplates()

    // 페이지가 다시 포커스될 때 목표 다시 불러오기
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchGoals()
        fetchTemplates()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('litpt_member')
    const member = raw ? JSON.parse(raw) : null
    if (!member || !goals.diet?.hashtags) return

    fetchHashtagCounts(member.member_id, goals.diet.hashtags)
  }, [goals.diet?.hashtags])

  const renderHashtags = () => {
    if (!goals.diet?.hashtags || templates.length === 0) return null
  
    return (
      <div className="mt-4 border-t pt-3">
        <div className="text-sm text-gray-500 mb-2">📌 해시태그 목표</div>
        <div className="flex flex-col gap-2">
          {goals.diet.hashtags.map((tag: string) => {
            const template = templates.find(t => t.hashtag_content === tag)
            return (
              <div key={tag} className="bg-gray-100 text-gray-800 px-3 py-2 text-sm rounded-lg">
                <div className="font-semibold">
                  {tag}{template?.description ? ` - ${template.description}` : ''}
                </div>
                <div className="text-xs mt-2 text-rose-600 whitespace-pre-line bg-rose-50 p-2 rounded">
                  {hashtagCounts[tag] != null ? (
                    <div>💬 {`${tag}은 최근 7일 동안 ${hashtagCounts[tag]}번 챙겼어요!`}</div>
                  ) : (
                    <div>💬 로딩 중...</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    )
  }

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 식단 목표 */}
        {goals.diet && (
          <div className="bg-white rounded-2xl shadow p-4 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-semibold text-rose-600">🥗 식단 목표</span>
            </div>
            <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
              <li>하루 <span className="font-medium">{goals.diet.meals_per_day}</span>끼 챙겨먹기</li>
              <li><span className="font-medium">{goals.diet.important_meal}</span> 챙겨먹기</li>
              <li><span className="font-medium">{goals.diet.finish_by_hour}</span>시 이전에 식사 종료</li>
              {goals.diet.custom && <li>{goals.diet.custom}</li>}
            </ul>
            {renderHashtags()}
          </div>
        )}

        {/* 수분 섭취 */}
        {goals.hydration && (
          <div className="bg-white rounded-2xl shadow p-4 border">
            <div className="text-lg font-semibold text-sky-600 mb-2">💧 수분 섭취</div>
            <p className="text-sm text-gray-700">하루 <span className="font-medium">{goals.hydration.cups_per_day}</span>잔 마시기 (500ml 기준)</p>
          </div>
        )}

        {/* 수면 패턴 */}
        {goals.sleep && (
          <div className="bg-white rounded-2xl shadow p-4 border">
            <div className="text-lg font-semibold text-purple-600 mb-2">🛌 수면 패턴</div>
            <p className="text-sm text-gray-700">하루 <span className="font-medium">{goals.sleep.hours_per_day}</span>시간 수면하기</p>
          </div>
        )}

        {/* 체성분 목표 */}
        {goals.body && (
          <div className="bg-white rounded-2xl shadow p-4 border">
            <div className="text-lg font-semibold text-emerald-600 mb-2">📈 체성분 목표</div>
            <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
              <li>매달 근육량 <span className="font-medium">{goals.body.muscle_gain_kg}</span>kg 증량</li>
              <li>매달 체지방량 <span className="font-medium">{goals.body.fat_loss_kg}</span>kg 감량</li>
            </ul>
          </div>
        )}
      </section>
    </>
  )
}
