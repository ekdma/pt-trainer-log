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
  const [userRole, setUserRole] = useState<'member' | 'trainer' | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [goals, setGoals] = useState<Goals>({})
  const [templates, setTemplates] = useState<Template[]>([])
  const supabase = getSupabaseClient()

  // 상태 변수들
  const [mealsPerDay, setMealsPerDay] = useState(3)
  const [importantMeal, setImportantMeal] = useState('아침')
  const [finishByHour, setFinishByHour] = useState(8)
  const [customGoal, setCustomGoal] = useState('')
  const [cupsPerDay, setCupsPerDay] = useState(2)
  const [sleepHours, setSleepHours] = useState(7)
  const [muscleGain, setMuscleGain] = useState(0)
  const [fatLoss, setFatLoss] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [memberTab, setMemberTab] = useState<'all' | 'active'>('active')
  const [hasAnyGoals, setHasAnyGoals] = useState(false)

  console.log(goals)
  useEffect(() => {
    const raw = localStorage.getItem('litpt_member')
    const user = raw ? JSON.parse(raw) : null
    if (user) {
      setUserRole(user.role)
      if (user.role === 'member') {
        setSelectedMember(user)
      } else {
        fetchAllMembers()
      }
    }
  }, [])

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
        setImportantMeal(diet.important_meal ?? '아침')
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
      toast.error('저장 중 오류가 발생했어요.')
    } else {
      toast.success('목표가 저장되었습니다!')
    }
  }

  const setDefaultGoals = () => {
    setMealsPerDay(3)
    setImportantMeal('아침')
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
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
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
                  전체회원
                </ToggleGroupItem>
                <ToggleGroupItem value="active" className="text-sm px-4 py-2">
                  현재회원
                </ToggleGroupItem>
              </ToggleGroup>
              <select
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
              </select>
            </div>
          </div>
        )}

        {selectedMember ? (
          <>
						<h2 className="text-lg font-bold text-gray-800 mb-6">목표 설정</h2>
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
                        <span>🥗</span> 식단 목표
                      </h3>

                      <div className="flex flex-col gap-3 mb-4">
                        <label className="text-sm text-gray-600 mb-1 block">📌 식사 패턴</label>

                        {/* 1. 끼 수 */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-lg">•</span>
                          <span className="text-sm">하루</span>
                          <select
                            className="text-sm form-select w-12 rounded border border-gray-300 px-2 py-1"
                            value={mealsPerDay}
                            onChange={(e) => setMealsPerDay(Number(e.target.value))}
                          >
                            {[2, 3].map((n) => (
                              <option key={n}>{n}</option>
                            ))}
                          </select>
                          <span className="text-sm">끼 챙겨먹기</span>
                        </div>

                        {/* 2. 중요한 끼니 */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-lg">•</span>
                          <select
                            className="text-sm form-select w-18 rounded border border-gray-300 px-2 py-1"
                            value={importantMeal}
                            onChange={(e) => setImportantMeal(e.target.value)}
                          >
                            {['아침', '점심', '저녁'].map((meal) => (
                              <option key={meal}>{meal}</option>
                            ))}
                          </select>
                          <span className="text-sm">챙겨먹기</span>
                        </div>

                        {/* 3. 마감 시간 */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-lg">•</span>
                          <select
                            className="text-sm form-select w-18 rounded border border-gray-300 px-2 py-1"
                            value={finishByHour}
                            onChange={(e) => setFinishByHour(Number(e.target.value))}
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                              <option key={h}>{h}</option>
                            ))}
                          </select>
                          <span className="text-sm">시 이전에 하루 식사 종료하기</span>
                        </div>
                      </div>


                      <div className="mb-4">
                        <label className="text-sm text-gray-600 mb-1 block">📌 개인 식단 목표</label>
                        <input
                          type="text"
                          value={customGoal}
                          onChange={(e) => setCustomGoal(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                          placeholder="예: 영양제 챙겨먹기"
                        />
                      </div>

                      {/* 해시태그 토글 버튼 그룹 */}
                      <div>
                        <label className="block text-sm text-gray-600 mb-2"># 해시태그 추천</label>
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
                        <span>💧</span> 수분 섭취
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">하루</span>
                        <select
                          className="text-sm form-select w-18 rounded border border-gray-300 px-2 py-1"
                          value={cupsPerDay}
                          onChange={(e) => setCupsPerDay(Number(e.target.value))}
                        >
                          {[1, 2, 3, 4].map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                        <span className="text-sm">잔 마시기 (500ml 기준)</span>
                      </div>
                    </section>

                    {/* 수면 패턴 카드 */}
                    <section className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition">
                      <h3 className="text-lg font-semibold text-gray-600 mb-4 flex items-center gap-2">
                        <span>🛌</span> 수면 패턴
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">하루</span>
                        <select
                          className="text-sm form-select w-18 rounded border border-gray-300 px-2 py-1"
                          value={sleepHours}
                          onChange={(e) => setSleepHours(Number(e.target.value))}
                        >
                          {Array.from({ length: 9 }, (_, i) => i + 4).map((h) => (
                            <option key={h}>{h}</option>
                          ))}
                        </select>
                        <span className="text-sm">시간 수면하기</span>
                      </div>
                    </section>

                    {/* 체성분 목표 카드 */}
                    <section className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition">
                      <h3 className="text-lg font-semibold text-gray-600 mb-4 flex items-center gap-2">
                        <span>📈</span> 체성분 목표
                      </h3>
                        
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-lg">•</span>
                        <span className="text-sm">매달 근육량</span>
                        <input
                          type="number"
                          value={muscleGain}
                          onChange={(e) => setMuscleGain(Number(e.target.value))}
                          min={0}
                          className="border border-gray-300 px-1 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 no-spinner"
                          style={{ width: '42px' }}
                          placeholder="0"
                        />
                        <style jsx global>{`
                          input[type=number].no-spinner::-webkit-inner-spin-button,
                          input[type=number].no-spinner::-webkit-outer-spin-button {
                            -webkit-appearance: none;
                            margin: 0;
                          }
                          input[type=number].no-spinner {
                            -moz-appearance: textfield;
                          }
                        `}</style>
                        <span className="text-sm">kg 증량하기</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-lg">•</span>
                        <span className="text-sm">매달 체지방량</span>
                        <input
                          type="number"
                          value={fatLoss}
                          onChange={(e) => setFatLoss(Number(e.target.value))}
                          min={0}
                          className="border border-gray-300 px-1 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                          style={{ width: '42px' }}
                          placeholder="0"
                        />
                        <style jsx global>{`
                          input[type=number].no-spinner::-webkit-inner-spin-button,
                          input[type=number].no-spinner::-webkit-outer-spin-button {
                            -webkit-appearance: none;
                            margin: 0;
                          }
                          input[type=number].no-spinner {
                            -moz-appearance: textfield;
                          }
                        `}</style>
                        <span className="text-sm">kg 감량하기</span>
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
                        목표 저장하기
                      </Button>
                    </div>
                  {/* )} */}
                </>
              ) : (
                <div className="text-gray-500 text-center text-sm space-y-4">
                  <p>🎯 목표를 설정해주세요.</p>
                  <Button 
                    onClick={setDefaultGoals} 
                    variant="outline" 
                    className="text-sm rounded-full px-5 py-2 border-gray-400"
                  >
                    목표 설정
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
