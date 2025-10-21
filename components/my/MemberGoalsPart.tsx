'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { subDays } from 'date-fns'

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

  const [latestMuscleMass, setLatestMuscleMass] = useState<number | null>(null)
  const [latestBodyFatMass, setLatestBodyFatMass] = useState<number | null>(null)

  const [avgSleepHours, setAvgSleepHours] = useState<number | null>(null)
  const [avgWaterIntake, setAvgWaterIntake] = useState<number | null>(null)

  const [latestMeasureDate, setLatestMeasureDate] = useState<string | null>(null)
  const [recentMeasureDate, setRecentMeasureDate] = useState<string | null>(null)

  const { t } = useLanguage()  // 번역 함수 가져오기

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

  const fetchLatestBodyMetrics = async (memberId: string) => {
    const { data, error } = await supabase
      .from('health_metrics')
      .select('metric_type, metric_value, measure_date')
      .eq('member_id', memberId)
      .in('metric_type', ['Skeletal Muscle Mass', 'Body Fat Mass'])
      .order('measure_date', { ascending: true }) // 오래된 순으로 정렬

    if (error || !data) return

    const byType = data.reduce((acc, cur) => {
      if (!acc[cur.metric_type]) acc[cur.metric_type] = []
      acc[cur.metric_type].push(cur)
      return acc
    }, {} as Record<string, typeof data>)

    const latestByType = (type: string) => byType[type]?.[byType[type].length - 1]
    const oldestByType = (type: string) => byType[type]?.[0]

    // 최신 측정값
    setLatestMuscleMass(latestByType('Skeletal Muscle Mass')?.metric_value ?? null)
    setLatestBodyFatMass(latestByType('Body Fat Mass')?.metric_value ?? null)
    setRecentMeasureDate(latestByType('Skeletal Muscle Mass')?.measure_date ?? null)

    // 기준일 (가장 오래된 측정일)
    setLatestMeasureDate(oldestByType('Skeletal Muscle Mass')?.measure_date ?? null)
  }

  const calculateAchievementRate = (
    base: number | null,
    current: number | null,
    gain: number,
    type: 'muscle' | 'fat'
  ) => {
    if (base === null || current === null || !gain || gain <= 0 || isNaN(gain)) return 0

    let achieved = 0
    if (type === 'muscle') achieved = ((current - base) / gain) * 100
    else achieved = ((base - current) / gain) * 100

    return Math.min(Math.max(achieved, 0), 100).toFixed(1)
  }

  const fetchAvgHealthMetrics = async (memberId: number) => {
    const fromDate = subDays(new Date(), 6) // 오늘 포함 최근 7일 (0~6일 전)

    const { data, error } = await supabase
      .from('health_metrics')
      .select('metric_type, metric_value')
      .eq('member_id', memberId)
      .in('metric_type', ['Sleep Hours', 'Water'])
      .gte('measure_date', fromDate.toISOString().substring(0,10)) // 날짜 문자열만 비교
      .lte('measure_date', new Date().toISOString().substring(0,10))

    if (error || !data) {
      console.error('평균 건강 지표 조회 오류:', error)
      setAvgSleepHours(null)
      setAvgWaterIntake(null)
      return
    }

    const sleepValues = data.filter(d => d.metric_type === 'Sleep Hours').map(d => Number(d.metric_value))
    const waterValues = data.filter(d => d.metric_type === 'Water').map(d => Number(d.metric_value))

    const avg = (arr: number[]) => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : null

    setAvgSleepHours(avg(sleepValues))
    setAvgWaterIntake(avg(waterValues))
  }

  useEffect(() => {
    const raw = localStorage.getItem('litpt_member')
    const member = raw ? JSON.parse(raw) : null
    if (!member) return

    fetchGoals()
    fetchTemplates()
    fetchLatestBodyMetrics(member.member_id)
    fetchAvgHealthMetrics(member.member_id)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchGoals()
        fetchTemplates()
        fetchLatestBodyMetrics(member.member_id)
        fetchAvgHealthMetrics(member.member_id)
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
        <div className="text-sm text-gray-500 mb-2">
          📌 {t('my.hashtagGoals')}
        </div>
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
                    <div>💬 {`${tag}${t('my.hashtagGoals_1')} ${hashtagCounts[tag]}${t('my.hashtagGoals_2')}`}</div>
                  ) : (
                    <div>💬 {t('master.loading')}</div>
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
              <span className="text-lg font-semibold text-rose-600">
                🥗 {t('my.dietGoals')}
              </span>
            </div>
            <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
              <li>
                {t('my.dietGoals_1')} <span className="font-medium">{goals.diet.meals_per_day}</span>{t('my.dietGoals_2')}
              </li>
              <li>
                {t('my.dietGoals_3')}
                <span className="font-medium">{t(`master.${goals.diet.important_meal}`)}</span>
                {t('my.dietGoals_4')}
              </li>
              <li>
                {t('my.dietGoals_5')}<span className="font-medium">{goals.diet.finish_by_hour}</span>{t('my.dietGoals_6')}
              </li>
              {goals.diet.custom && <li>{goals.diet.custom}</li>}
            </ul>
            {renderHashtags()}
          </div>
        )}

        {/* 수분 섭취 */}
        {goals.hydration && (
          <div className="bg-white rounded-2xl shadow p-4 border">
            <div className="text-lg font-semibold text-sky-600 mb-2">
              💧 {t('my.waterIntakeGoal')}
            </div>
            <p className="text-sm text-gray-700">
              {t('my.waterIntakeGoal_1')} <span className="font-medium">{goals.hydration.cups_per_day}</span>{t('my.waterIntakeGoal_2')}
            </p>
            {avgWaterIntake !== null && (
              <div className="text-xs mt-2 text-rose-600 whitespace-pre-line bg-rose-50 p-2 rounded">
                💬 {t('my.waterIntakeGoal_3')}<span className="font-semibold">{avgWaterIntake.toFixed(1)}</span> {t('my.waterIntakeGoal_4')}
              </div>
            )}
          </div>
        )}

        {/* 수면 패턴 */}
        {goals.sleep && (
          <div className="bg-white rounded-2xl shadow p-4 border">
            <div className="text-lg font-semibold text-purple-600 mb-2">
              🛌 {t('my.sleepGoal')}
            </div>
            <p className="text-sm text-gray-700">
              {t('my.sleepGoal_1')} <span className="font-medium">{goals.sleep.hours_per_day}</span>{t('my.sleepGoal_2')}
            </p>
            {avgSleepHours !== null && (
              <div className="text-xs mt-2 text-rose-600 whitespace-pre-line bg-rose-50 p-2 rounded">
                💬 {t('my.sleepGoal_3')} <span className="font-semibold">{avgSleepHours.toFixed(1)}</span> {t('my.sleepGoal_4')}
              </div>
            )}
          </div>
        )}


        {/* 체성분 목표 */}
        {goals.body && (
          <div className="bg-white rounded-2xl shadow p-4 border">
            <div className="text-lg font-semibold text-emerald-600 mb-2">
              📈 {t('my.bodycompositionGoal')}
            </div>

            {/* 기준일 / 최신일 */}
            {(latestMeasureDate || recentMeasureDate) && (
              <div className="flex flex-wrap justify-between text-xs text-gray-500 mb-3 border-b border-gray-100 pb-2">
                {latestMeasureDate && (
                  <span>
                    🗓️ {t('my.baseline')}:{" "}
                    <span className="font-medium text-gray-600">
                      {new Date(latestMeasureDate).toLocaleDateString('ko-KR')}
                    </span>
                  </span>
                )}
                {recentMeasureDate && (
                  <span>
                    ⏱️ {t('my.latest')}:{" "}
                    <span className="font-medium text-gray-600">
                      {new Date(recentMeasureDate).toLocaleDateString('ko-KR')}
                    </span>
                  </span>
                )}
              </div>
            )}
            
            {/* 골격근량 */}
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2 transition hover:bg-emerald-50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-emerald-500 text-lg">💪</span>
                <span className="text-sm font-medium text-gray-700">
                  {t('my.bodycompositionGoal_1')}
                  <span className="text-emerald-600 font-semibold">
                    {" "}
                    +{goals.body.muscle_gain_kg}kg{" "}
                  </span>
                  {t('my.bodycompositionGoal_2')}
                </span>
              </div>

              {/* 기준값 → 목표값 */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-white/60 rounded-lg px-3 py-2 border border-emerald-100 text-sm text-gray-700">
                <span>
                  📊{" "}
                  <span className="font-medium text-gray-800">
                    {latestMuscleMass !== null ? `${latestMuscleMass}kg` : t('master.noData')}
                  </span>
                  {goals.body.muscle_gain_kg > 0 && latestMuscleMass !== null && (
                    <span className="text-emerald-600 font-semibold">
                      {" "}
                      → {(latestMuscleMass + goals.body.muscle_gain_kg)}kg
                    </span>
                  )}
                </span>
              </div>

              {/* 최근 측정값 + 달성률 */}
              {recentMeasureDate && (
                <div className="flex flex-col justify-between items-start bg-emerald-50 rounded-lg px-3 py-2 text-sm text-gray-700 border border-emerald-100 mt-1 space-y-1">
                  <span>
                    {t('my.latest')}:{" "}
                    <span className="font-semibold text-emerald-600">
                      {latestMuscleMass ?? '-'}kg
                    </span>
                  </span>
                  <span className="text-xs text-gray-500">
                    🎯 {t('my.progress')}:{" "}
                    <span className="font-semibold text-emerald-600">
                      {calculateAchievementRate(
                        latestMuscleMass,
                        latestMuscleMass, // 나중에 recentMuscleMass로 교체 가능
                        goals.body.muscle_gain_kg,
                        'muscle'
                      )}
                      %
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* 체지방량 */}
            <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/40 space-y-2 transition hover:bg-rose-50 mt-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-rose-500 text-lg">🔥</span>
                <span className="text-sm font-medium text-gray-700">
                  {t('my.bodycompositionGoal_3')}
                  <span className="text-rose-600 font-semibold">
                    {" "}
                    -{goals.body.fat_loss_kg}kg{" "}
                  </span>
                  {t('my.bodycompositionGoal_4')}
                </span>
              </div>

              {/* 기준값 → 목표값 */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-white/60 rounded-lg px-3 py-2 border border-rose-100 text-sm text-gray-700">
                <span>
                  📊{" "}
                  <span className="font-medium text-gray-800">
                    {latestBodyFatMass !== null ? `${latestBodyFatMass}kg` : t('master.noData')}
                  </span>
                  {goals.body.fat_loss_kg > 0 && latestBodyFatMass !== null && (
                    <span className="text-rose-600 font-semibold">
                      {" "}
                      → {(latestBodyFatMass - goals.body.fat_loss_kg)}kg
                    </span>
                  )}
                </span>
              </div>

              {/* 최근 측정값 + 달성률 */}
              {recentMeasureDate && (
                <div className="flex flex-col justify-between items-start bg-rose-50 rounded-lg px-3 py-2 text-sm text-gray-700 border border-rose-100 mt-1 space-y-1">
                  <span>
                    {t('my.latest')}:{" "}
                    <span className="font-semibold text-rose-600">
                      {latestBodyFatMass ?? '-'}kg
                    </span>
                  </span>
                  <span className="text-xs text-gray-500">
                    🎯 {t('my.progress')}:{" "}
                    <span className="font-semibold text-rose-600">
                      {calculateAchievementRate(
                        latestBodyFatMass,
                        latestBodyFatMass, // 나중에 recentBodyFatMass로 교체 가능
                        goals.body.fat_loss_kg,
                        'fat'
                      )}
                      %
                    </span>
                  </span>
                </div>
              )}

            </div>
          </div>
        )}

      </section>
    </>
  )
}
