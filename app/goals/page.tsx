'use client'

import { useEffect, useState } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import Header from '@/components/layout/Header'
import TrainerHeader from '@/components/layout/TrainerHeader'
import { getSupabaseClient } from '@/lib/supabase'
import type { Member } from '@/components/members/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import { motion } from 'framer-motion'
import MemberSelectListbox from '@/components/ui/MemberSelectListbox'  
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'

interface Sessions {
  pt_session_cnt: number
  group_session_cnt: number
  self_session_cnt: number
}

interface Goals {
  sessions?: Sessions
  diet?: DietGoal
  hydration?: HydrationGoal
  sleep?: SleepGoal
  body?: BodyGoal
}

interface Template {
  id: number
  hashtag_content: string
  description?: string
}

interface DietGoal {
  meals_per_day?: number
  important_meal?: string
  finish_by_hour?: number
  custom?: string
  hashtags?: string[]
}

interface HydrationGoal {
  cups_per_day?: number
}

interface SleepGoal {
  hours_per_day?: number
}

interface BodyGoal {
  muscle_gain_kg?: number
  fat_loss_kg?: number
}

type GoalContent = DietGoal | HydrationGoal | SleepGoal | BodyGoal

export default function GoalsPage() {
  useAuthGuard()
  const { t } = useLanguage()  // 번역 함수 가져오기
  const { user } = useAuth() 

  const userRole = user?.role
  // const [userRole, setUserRole] = useState<'member' | 'trainer' | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [goals, setGoals] = useState<Goals>({})
  const [templates, setTemplates] = useState<Template[]>([])
  const supabase = getSupabaseClient()

  // 상태 변수들
  const [mealsPerDay, setMealsPerDay] = useState(3)
  const [importantMeal, setImportantMeal] = useState('breakfast')
  const [finishByHour, setFinishByHour] = useState(8)
  const [customGoal, setCustomGoal] = useState('')
  const [cupsPerDay, setCupsPerDay] = useState(2)
  const [sleepHours, setSleepHours] = useState(7)
  const [muscleGain, setMuscleGain] = useState(0)
  const [fatLoss, setFatLoss] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [memberTab, setMemberTab] = useState<'all' | 'active'>('active')
  const [hasAnyGoals, setHasAnyGoals] = useState(false)
  
  const mealKeys = ['breakfast', 'lunch', 'dinner']

  const [latestMuscleMass, setLatestMuscleMass] = useState<number | null>(null)
  const [latestBodyFatMass, setLatestBodyFatMass] = useState<number | null>(null)

  console.log(goals)
  
  // useEffect(() => {
  //   const raw = localStorage.getItem('litpt_member')
  //   const user = raw ? JSON.parse(raw) : null
  //   if (user) {
  //     setUserRole(user.role)
  //     if (user.role === 'member') {
  //       setSelectedMember(user)
  //     } else {
  //       fetchAllMembers()
  //     }
  //   }
  // }, [])
  useEffect(() => {
    if (!user) return
    // setUserRole(user.role)
    if (user.role === 'member') {
      setSelectedMember(user) // 바로 Member 타입이므로 문제 없음
    } else {
      fetchAllMembers()
    }
  }, [user])

  // 트레이너: 회원 목록 조회
  const fetchAllMembers = async () => {
    const query = supabase.from('members').select('*')

    // memberTab 상태에 따라 쿼리 조건 분기
    if (memberTab === 'active') {
      query.eq('status', 'active')
    } else {
      query.neq('status', 'delete')
    }

    const { data } = await query
    setMembers(data || [])
  }

  useEffect(() => {
    fetchAllMembers()
  }, [memberTab])

  useEffect(() => {
    if (selectedMember) {
      fetchActivePackage()
      fetchFoodTemplates()
      fetchSavedGoals()
      fetchLatestBodyMetrics()
    }
  }, [selectedMember])
  
  const fetchActivePackage = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('member_packages')
      .select('pt_session_cnt, group_session_cnt, self_session_cnt')
      .eq('member_id', selectedMember?.member_id)
      .eq('status', 'active')
      .lte('start_date', today)
      .gte('end_date', today)
      .single()

    if (!error && data) {
      setGoals((prev: Goals) => ({
        ...prev,
        sessions: data
      }))
    }
  }

  const fetchFoodTemplates = async () => {
    const { data, error } = await supabase.from('food_hashtag_templates').select('*')
    if (!error && data) {
      const sorted = data.sort((a, b) => a.hashtag_content.localeCompare(b.hashtag_content))
      setTemplates(sorted)
    }
  }
  
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const fetchLatestBodyMetrics = async () => {
    if (!selectedMember) return
  
    const { data, error } = await supabase
      .from('health_metrics')
      .select('metric_type, metric_value, measure_date')
      .eq('member_id', selectedMember.member_id)
      .in('metric_type', ['Skeletal Muscle Mass', 'Body Fat Mass'])
      .order('measure_date', { ascending: false })
  
    if (error) {
      console.error('체성분 데이터 조회 실패:', error)
      return
    }
  
    if (data && data.length > 0) {
      // 가장 최근 측정일 기준으로 필터
      const latestByType = data.reduce((acc, cur) => {
        if (!acc[cur.metric_type]) {
          acc[cur.metric_type] = cur
        }
        return acc
      }, {} as Record<string, typeof data[0]>)
  
      setLatestMuscleMass(latestByType['Skeletal Muscle Mass']?.metric_value ?? null)
      setLatestBodyFatMass(latestByType['Body Fat Mass']?.metric_value ?? null)
    }
  }
  
	const fetchSavedGoals = async () => {
		const { data, error } = await supabase
			.from('member_goals')
			.select('*')
			.eq('member_id', selectedMember?.member_id)
			.order('created_at', { ascending: false })
	
    if (!error && data) {
      if (data.length === 0) {
        setHasAnyGoals(false)
        return
      }
  
      setHasAnyGoals(true)

      const latestGoals = new Map<string, GoalContent>()
      for (const goal of data) {
        if (!latestGoals.has(goal.goal_type)) {
          latestGoals.set(goal.goal_type, goal.content)
        }
      }
    
      const diet = latestGoals.get('diet') as DietGoal | undefined
      if (diet) {
        setMealsPerDay(diet.meals_per_day ?? 3)
        setImportantMeal(diet.important_meal ?? 'breakfast')
        setFinishByHour(diet.finish_by_hour ?? 8)
        setCustomGoal(diet.custom ?? '')
        setSelectedTags(diet.hashtags ?? [])
      }
    
      const hydration = latestGoals.get('hydration') as HydrationGoal | undefined
      if (hydration) {
        setCupsPerDay(hydration.cups_per_day ?? 2)
      }
    
      const sleep = latestGoals.get('sleep') as SleepGoal | undefined
      if (sleep) {
        setSleepHours(sleep.hours_per_day ?? 7)
      }
    
      const body = latestGoals.get('body') as BodyGoal | undefined
      if (body) {
        setMuscleGain(body.muscle_gain_kg ?? 0)
        setFatLoss(body.fat_loss_kg ?? 0)
      }
    }
  }
	
  const handleSaveGoals = async () => {
    if (!selectedMember) return

    const today = new Date().toISOString()

    const dietGoal = {
      meals_per_day: mealsPerDay,
      important_meal: importantMeal,
      finish_by_hour: finishByHour,
      custom: customGoal,
      hashtags: selectedTags,
    }

    const hydrationGoal = {
      cups_per_day: cupsPerDay,
    }

    const sleepGoal = {
      hours_per_day: sleepHours,
    }

    const bodyGoal = {
      muscle_gain_kg: muscleGain,
      fat_loss_kg: fatLoss,
    }

		await supabase
			.from('member_goals')
			.delete()
			.eq('member_id', selectedMember.member_id)

    const { error } = await supabase.from('member_goals').insert([
      {
        member_id: selectedMember.member_id,
        goal_type: 'diet',
        content: dietGoal,
        created_at: today,
      },
      {
        member_id: selectedMember.member_id,
        goal_type: 'hydration',
        content: hydrationGoal,
        created_at: today,
      },
      {
        member_id: selectedMember.member_id,
        goal_type: 'sleep',
        content: sleepGoal,
        created_at: today,
      },
      {
        member_id: selectedMember.member_id,
        goal_type: 'body',
        content: bodyGoal,
        created_at: today,
      },
    ])

    if (error) {
      console.error('저장 실패:', error.message)
      toast.error(t('alert.goal_error'))
    } else {
      toast.error(t('alert.goal_save'))
    }
  }

  const setDefaultGoals = () => {
    setMealsPerDay(3)
    setImportantMeal('breakfast')
    setFinishByHour(8)
    setCustomGoal('')
    setSelectedTags([])

    setCupsPerDay(2)
    setSleepHours(7)

    setMuscleGain(0)
    setFatLoss(0)

    setHasAnyGoals(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {userRole === 'trainer' ? <TrainerHeader /> : <Header />}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 회원 선택 (트레이너용) */}
        {userRole === 'trainer' && (
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <ToggleGroup
                type="single"
                value={memberTab}
                onValueChange={(value) => {
                  if (value) setMemberTab(value as 'all' | 'active')
                }}
              >
                <ToggleGroupItem value="all" className="text-sm px-4 py-2">
                  <span className="hidden sm:inline">전체회원</span>
                  <span className="inline sm:hidden">전체</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="active" className="text-sm px-4 py-2">
                  <span className="hidden sm:inline">현재회원</span>
                  <span className="inline sm:hidden">현재</span>
                </ToggleGroupItem>
              </ToggleGroup>
              <MemberSelectListbox
                members={members}
                value={selectedMember}
                onChange={setSelectedMember}
                getKey={(m) => m.member_id}
                getName={(m) => m.name}
              />
              {/* <select
                value={selectedMember?.member_id || ''}
                onChange={(e) => {
                  const selectedId = e.target.value
                  const m = members.find(m => String(m.member_id) === selectedId)
                  setSelectedMember(m || null)
                }}
                className="block w-full max-w-md px-4 py-2 text-base border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition duration-200 hover:border-rose-400 cursor-pointer"
              >
                <option value="">회원 선택</option>
                {members
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                  .map((m) => (
                    <option key={m.member_id} value={m.member_id}>
                      {m.name}
                    </option>
                  ))}
              </select> */}
            </div>
          </div>
        )}

        {selectedMember ? (
          <>
						<h2 className="text-lg font-bold text-gray-800 mb-6">
              {t('goals.goalsTitle')}
            </h2>
              <motion.div
                key={selectedMember?.member_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              > 
              {hasAnyGoals ? (
                <>
                  {/* 목표 카드를 grid로 배치 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 운동 횟수 카드 */}
                    {/* <section className="bg-white rounded-2xl shadow-md p-6 border border-indigo-200 hover:shadow-lg transition">
                      <h3 className="text-xl font-semibold text-indigo-600 mb-4 flex items-center gap-2">
                        <span>💪</span> 운동 횟수
                      </h3>
                      {goals.sessions ? (
                        <ul className="text-gray-700 space-y-2 list-disc list-inside">
                          <li>PT 세션: <span className="font-semibold">{goals.sessions.pt_session_cnt}회</span></li>
                          <li>그룹 세션: <span className="font-semibold">{goals.sessions.group_session_cnt}회</span></li>
                          <li>셀프 세션: <span className="font-semibold">{goals.sessions.self_session_cnt}회</span></li>
                        </ul>
                      ) : (
                        <p className="text-gray-500 italic">활성화된 패키지가 없습니다.</p>
                      )}
                    </section> */}

                    {/* 식단 목표 카드 */}
                    <section className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition flex flex-col">
                      <h3 className="text-lg font-semibold text-gray-600 mb-4 flex items-center gap-2">
                        <span>🥗</span> {t('my.dietGoals')}
                      </h3>

                      <div className="flex flex-col gap-3 mb-4">
                        <label className="text-sm text-gray-600 mb-1 block">📌 {t('goals.mealPattern')}</label>

                        {/* 1. 끼 수 */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-lg">•</span>
                          <span className="text-sm">
                            {t('my.dietGoals_1')}
                          </span>
                          <select
                            className="text-sm form-select w-12 rounded border border-gray-300 px-2 py-1"
                            value={mealsPerDay}
                            onChange={(e) => setMealsPerDay(Number(e.target.value))}
                          >
                            {[2, 3].map((n) => (
                              <option key={n}>{n}</option>
                            ))}
                          </select>
                          <span className="text-sm">
                            {t('my.dietGoals_2')}
                          </span>
                        </div>

                        {/* 2. 중요한 끼니 */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-lg">•</span>
                          <span className="text-sm">
                              {t('my.dietGoals_3')}
                          </span>
                          <select
                            className="text-sm form-select w-18 rounded border border-gray-300 px-2 py-1"
                            value={importantMeal}
                            onChange={(e) => setImportantMeal(e.target.value)}
                          >
                            
                            {mealKeys.map((key) => (
                              <option key={key} value={key}>
                                {t(`master.${key}`)}
                              </option>
                            ))}
                          </select>
                          <span className="text-sm">{t('my.dietGoals_4')}</span>
                        </div>

                        {/* 3. 마감 시간 */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-lg">•</span>
                          <span className="text-sm">
                              {t('my.dietGoals_5')}
                          </span>
                          <select
                            className="text-sm form-select w-18 rounded border border-gray-300 px-2 py-1"
                            value={finishByHour}
                            onChange={(e) => setFinishByHour(Number(e.target.value))}
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                              <option key={h}>{h}</option>
                            ))}
                          </select>
                          <span className="text-sm">{t('my.dietGoals_6')}</span>
                        </div>
                      </div>


                      <div className="mb-4">
                        <label className="text-sm text-gray-600 mb-1 block">📌 {t('goals.personalGoals')}</label>
                        <input
                          type="text"
                          value={customGoal}
                          onChange={(e) => setCustomGoal(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                          placeholder={t('goals.personalGoalsEG')}
                        />
                      </div>

                      {/* 해시태그 토글 버튼 그룹 */}
                      <div>
                        <label className="block text-sm text-gray-600 mb-2"># {t('my.hashtagGoals')}</label>
                        <div className="flex flex-wrap gap-2">
                          {templates.map((t) => {
                            const isSelected = selectedTags.includes(t.hashtag_content)
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => toggleTag(t.hashtag_content)}
                                className={`px-3 py-1 rounded-full text-sm border transition
                                  ${isSelected
                                    ? 'bg-gray-600 text-white border-gray-600'
                                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}
                                `}
                              >
                                {t.hashtag_content}{t.description && ` - ${t.description}`}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </section>

                    {/* 수분 섭취 카드 */}
                    <section className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition">
                      <h3 className="text-lg font-semibold text-gray-600 mb-4 flex items-center gap-2">
                        <span>💧</span> {t('my.waterIntakeGoal')}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {t('my.waterIntakeGoal_1')}
                        </span>
                        <select
                          className="text-sm form-select w-18 rounded border border-gray-300 px-2 py-1"
                          value={cupsPerDay}
                          onChange={(e) => setCupsPerDay(Number(e.target.value))}
                        >
                          {[1, 2, 3, 4].map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                        <span className="text-sm">
                          {t('my.waterIntakeGoal_2')}
                        </span>
                      </div>
                    </section>

                    {/* 수면 패턴 카드 */}
                    <section className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition">
                      <h3 className="text-lg font-semibold text-gray-600 mb-4 flex items-center gap-2">
                        <span>🛌</span> {t('my.sleepGoal')}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {t('my.sleepGoal_1')}
                        </span>
                        <select
                          className="text-sm form-select w-18 rounded border border-gray-300 px-2 py-1"
                          value={sleepHours}
                          onChange={(e) => setSleepHours(Number(e.target.value))}
                        >
                          {Array.from({ length: 9 }, (_, i) => i + 4).map((h) => (
                            <option key={h}>{h}</option>
                          ))}
                        </select>
                        <span className="text-sm">
                          {t('my.sleepGoal_2')}
                        </span>
                      </div>
                    </section>

                    {/* 체성분 목표 카드 */}
                    <section className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition space-y-2">
                      <h3 className="text-lg font-semibold text-gray-600 flex items-center gap-2">
                        <span>📈</span> {t('my.bodycompositionGoal')}
                      </h3>

                      {/* 골격근량 */}
                      <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-400 text-lg">•</span>
                          <span className="text-sm">{t('my.bodycompositionGoal_1')}</span>
                          <input
                            type="number"
                            value={muscleGain}
                            onChange={(e) => setMuscleGain(Number(e.target.value))}
                            min={0}
                            className="border border-gray-300 px-2 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 no-spinner"
                            style={{ width: '50px' }}
                            placeholder="0"
                          />
                          <span className="text-sm">kg {t('my.bodycompositionGoal_2')}</span>
                        </div>
                        <div className="ml-6 text-sm text-gray-500 flex items-center gap-2">
                          📊
                          <span className="font-medium text-gray-700">
                            {latestMuscleMass !== null ? `${latestMuscleMass}kg` : `${t('master.noData')})`}
                          </span>
                          {hasAnyGoals && latestMuscleMass !== null && (
                            <span className="font-semibold text-emerald-600">
                              → {(latestMuscleMass + muscleGain)}kg
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 체지방량 */}
                      <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-lg">•</span>
                          <span className="text-sm">{t('my.bodycompositionGoal_3')}</span>
                          <input
                            type="number"
                            value={fatLoss}
                            onChange={(e) => setFatLoss(Number(e.target.value))}
                            min={0}
                            className="border border-gray-300 px-2 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 no-spinner"
                            style={{ width: '50px' }}
                            placeholder="0"
                          />
                          <span className="text-sm">kg {t('my.bodycompositionGoal_4')}</span>
                        </div>
                        <div className="ml-6 text-sm text-gray-500 flex items-center gap-2">
                          📊
                          <span className="font-medium text-gray-700">
                            {latestBodyFatMass !== null ? `${latestBodyFatMass}kg` : `${t('master.noData')})`}
                          </span>
                          {hasAnyGoals && latestBodyFatMass !== null && (
                            <span className="font-semibold text-rose-600">
                              → {(latestBodyFatMass - fatLoss)}kg
                            </span>
                          )}
                        </div>
                      </div>
                    </section>

                  </div>

                  {/* 저장 버튼 */}
                  {/* {userRole === 'member' && ( */}
                    <div className="text-center">
                      {/* <button
                        onClick={handleSaveGoals}
                        className="text-sm mt-6 bg-rose-600 text-white font-semibold px-6 py-3 rounded-full shadow hover:bg-rose-700 transition"
                      >
                        목표 저장하기
                      </button> */}
                      <Button 
                        onClick={handleSaveGoals}
                        variant="darkGray" 
                        className="mt-6 text-sm rounded-full shadow px-6 py-3">
                        {t('master.save')}
                      </Button>
                    </div>
                  {/* )} */}
                </>
              ) : (
                <div className="text-gray-500 text-center text-sm space-y-4">
                  <p>🎯 {t('goals.pleaseSetGoal')}</p>
                  <Button 
                    onClick={setDefaultGoals} 
                    variant="outline" 
                    className="text-sm rounded-full px-5 py-2 border-gray-400"
                  >
                    {t('goals.goalSetting')}
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        ) : (
          <div className="text-gray-600">회원을 선택하세요.</div>
        )}
      </main>
    </div>
  )
}
