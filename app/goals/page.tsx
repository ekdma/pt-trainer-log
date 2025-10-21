'use client'

import { useRef, useState, useEffect } from 'react'
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
// import MyCalendarPage from '../my-calendar/page'

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
  base_muscle_mass?: number
  base_body_fat_mass?: number
  base_measure_date?: string
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

  const [goalImageUrl, setGoalImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isEditingGoal, setIsEditingGoal] = useState(false)  

  const [latestMeasureDate, setLatestMeasureDate] = useState<string | null>(null)
  const [lastSavedDate, setLastSavedDate] = useState<string | null>(null)
  const [recentMuscleMass, setRecentMuscleMass] = useState<number | null>(null)
  const [recentBodyFatMass, setRecentBodyFatMass] = useState<number | null>(null)
  const [recentMeasureDate, setRecentMeasureDate] = useState<string | null>(null)

  console.log(goals)

  const handleStartGoalSetting = async () => {
    if (!selectedMember) return

    // 1️⃣ health_metrics 테이블에서 체지방량/골격근량 최신값 조회
    const { data, error } = await supabase
      .from('health_metrics')
      .select('metric_type, metric_value, measure_date')
      .eq('member_id', selectedMember.member_id)
      .in('metric_type', ['Skeletal Muscle Mass', 'Body Fat Mass'])
      .order('measure_date', { ascending: false })

    if (error) {
      console.error('health_metrics 조회 실패:', error)
    }

    if (data && data.length > 0) {
      // 최신값만 추출
      const latestByType = data.reduce((acc, cur) => {
        if (!acc[cur.metric_type]) acc[cur.metric_type] = cur
        return acc
      }, {} as Record<string, typeof data[0]>)

      // 최신 측정값 세팅
      const recentMuscle = latestByType['Skeletal Muscle Mass']?.metric_value ?? null
      const recentFat = latestByType['Body Fat Mass']?.metric_value ?? null
      const measureDate = data[0]?.measure_date ?? null

      // 기준값으로 저장
      setLatestMuscleMass(recentMuscle)
      setLatestBodyFatMass(recentFat)
      setLatestMeasureDate(measureDate)

      // 최근 측정값도 함께 저장
      setRecentMuscleMass(recentMuscle)
      setRecentBodyFatMass(recentFat)
      setRecentMeasureDate(measureDate)

      toast.success('📊 최신 측정 데이터를 기준으로 목표를 설정합니다.')
    } else {
      // health_metrics 값이 없으면 기본값 세팅
      setDefaultGoals()
    }

    setIsEditingGoal(true)
  }

  
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
      ;(async () => {
        await fetchSavedGoals()
        // ✅ 저장된 기준값이 없을 때만 최신값 갱신
        if (latestMuscleMass === null && latestBodyFatMass === null) {
          fetchLatestBodyMetrics()
        }
      })()
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

    if (error || !data) return console.error('체성분 데이터 조회 실패:', error)

    // 최신값
    const latestByType = data.reduce((acc, cur) => {
      if (!acc[cur.metric_type]) acc[cur.metric_type] = cur
      return acc
    }, {} as Record<string, typeof data[0]>)

    setRecentMuscleMass(latestByType['Skeletal Muscle Mass']?.metric_value ?? null)
    setRecentBodyFatMass(latestByType['Body Fat Mass']?.metric_value ?? null)
    setRecentMeasureDate(data[0]?.measure_date ?? null)
  }

  
	const fetchSavedGoals = async () => {
		const { data, error } = await supabase
			.from('member_goals')
			.select('*')
			.eq('member_id', selectedMember?.member_id)
			.order('created_at', { ascending: false })
	
    if (!error && data) {
      const lastGoal = data[0]
      setLastSavedDate(lastGoal.created_at)

      const hasGoals = data.some(goal =>
        goal.goal_type !== 'image' || goal.goal_image_url
      )

      setHasAnyGoals(hasGoals)

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

        // ✅ 저장된 기준값이 있으면 그대로 유지
        if (body.base_muscle_mass !== undefined) {
          setLatestMuscleMass(body.base_muscle_mass)
        }
        if (body.base_body_fat_mass !== undefined) {
          setLatestBodyFatMass(body.base_body_fat_mass)
        }

        // ✅ 기준 측정일 세팅
        if (body.base_measure_date) {
          setLatestMeasureDate(body.base_measure_date)
        }
      }
    }
  }

  const isGoalChanged = (existing: any, current: any): boolean => {
    if (!existing) return true;

    for (const key of Object.keys(current)) {
      const currVal = current[key];
      const existVal = existing[key];

      if (Array.isArray(currVal) && Array.isArray(existVal)) {
        // 배열 비교
        if (currVal.length !== existVal.length) return true;
        for (let i = 0; i < currVal.length; i++) {
          if (currVal[i] !== existVal[i]) return true;
        }
      } else if (typeof currVal === 'object' && currVal !== null && existVal !== null) {
        // 객체 비교 (재귀)
        if (isGoalChanged(existVal, currVal)) return true;
      } else if (typeof currVal === 'number' || typeof existVal === 'number') {
        if (Number(currVal) !== Number(existVal)) return true;
      } else if (currVal !== existVal) {
        return true;
      }
    }
    return false;
  };

	
  const handleSaveGoals = async () => {
    if (!selectedMember) return

    const today = new Date().toISOString()

    const normalize = (obj: any) =>
      Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, v === '' || v === undefined ? null : v])
      );

    const goals = {
      diet: normalize({
        meals_per_day: Number(mealsPerDay),
        important_meal: importantMeal || null,
        finish_by_hour: Number(finishByHour),
        custom: customGoal?.trim() || null,
        hashtags: selectedTags || [],
      }),
      hydration: normalize({ cups_per_day: Number(cupsPerDay) }),
      sleep: normalize({ hours_per_day: Number(sleepHours) }),
      body: normalize({
        base_muscle_mass: latestMuscleMass ?? null,
        base_body_fat_mass: latestBodyFatMass ?? null,
        base_measure_date: latestMeasureDate ?? today,
        muscle_gain_kg: Number(muscleGain),
        fat_loss_kg: Number(fatLoss),
      }),
    };
    
		try {
      // ✅ 기존 goal 데이터 전체 조회
      const { data: existingGoals, error: fetchError } = await supabase
        .from("member_goals")
        .select("goal_type, content")
        .eq("member_id", selectedMember.member_id);

      if (fetchError) throw fetchError;

      const existingGoalsMap = new Map(
        existingGoals?.map((g) => [g.goal_type, g.content]) || []
      );

      // ✅ 변경된 goalType만 업데이트
      const changedGoals: string[] = [];

      for (const [goalType, content] of Object.entries(goals)) {
        const existingContentRaw = existingGoalsMap.get(goalType);
        const existingContent = existingContentRaw ? normalize(existingContentRaw) : null;

        if (existingContent && isGoalChanged(existingContent, content)) {
          // 변경된 항목만 update
          const { error: updateError } = await supabase
            .from("member_goals")
            .update({
              content,
              updated_at: new Date().toISOString(),
            })
            .eq("member_id", selectedMember.member_id)
            .eq("goal_type", goalType);

          if (updateError) throw updateError;
          changedGoals.push(goalType);
        } else if (!existingContent) {
          // 신규 항목 insert
          const { error: insertError } = await supabase
            .from("member_goals")
            .insert([
              {
                member_id: selectedMember.member_id,
                goal_type: goalType,
                content,
                created_at: new Date().toISOString(),
              },
            ]);

          if (insertError) throw insertError;
          changedGoals.push(goalType);
        }
      }


      if (changedGoals.length > 0) {
        toast.success(`${changedGoals.join(", ")} ${t("alert.goal_save")}`);
      } else {
        toast.message(t("alert.goal_nochange"));
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('저장 실패:', error.message)
      } else {
        console.error('저장 실패 (알 수 없는 오류):', error)
      }
      toast.error(t('alert.goal_error'))
    } finally {
      setIsEditingGoal(false)
    }
  }

  const handleResetGoals = async () => {
    if (!selectedMember) return

    if (!recentMeasureDate || recentMuscleMass == null || recentBodyFatMass == null) {
      toast.warning('최근 측정 데이터가 없습니다 😥')
      return
    }

    // 최근 측정값으로 기준 재설정
    setLatestMeasureDate(recentMeasureDate)
    setLatestMuscleMass(recentMuscleMass)
    setLatestBodyFatMass(recentBodyFatMass)

    // 오늘 날짜를 기준으로 목표를 다시 저장
    const today = new Date().toISOString()

    const newBodyGoal = {
      base_muscle_mass: recentMuscleMass,
      base_body_fat_mass: recentBodyFatMass,
      base_measure_date: recentMeasureDate,
      muscle_gain_kg: muscleGain,
      fat_loss_kg: fatLoss,
    }

    try {
      const { error } = await supabase
        .from('member_goals')
        .update({
          content: newBodyGoal,
          updated_at: today,
        })
        .eq('member_id', selectedMember.member_id)
        .eq('goal_type', 'body')

      if (error) throw error

      setLastSavedDate(today)
      toast.success(t("alert.goal_resetgoal"))
    } catch (err) {
      console.error('목표 재설정 실패:', err)
      toast.error(t("alert.goal_resetgoal_fail"))
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

  useEffect(() => {
    if (!selectedMember) return
    // 로그인할 때 목표 사진 불러오기
    fetchGoalImage()
  }, [selectedMember])

  const fetchGoalImage = async () => {
    if (!selectedMember) return
    const { data, error } = await supabase
      .from('member_goals')
      .select('goal_image_url')
      .eq('member_id', selectedMember.member_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!error && data?.goal_image_url) {
      setGoalImageUrl(data.goal_image_url)
    }
  }

  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !selectedMember) return
    const file = event.target.files[0]

    const timestamp = Date.now()
    const ext = file.name.split('.').pop() || 'jpg'
    // const filePath = `goal_images/${selectedMember.member_id}_${timestamp}.${ext}`
    const filePath = `public/goal_images/${selectedMember.member_id}_${timestamp}.${ext}`

    // 업로드
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error(uploadError)
      toast.error('이미지 업로드 실패 😥')
      return
    }

    // public URL 가져오기
    const { data } = supabase.storage.from('photos').getPublicUrl(filePath)
    const publicUrl = data.publicUrl


    console.log('Supabase Public URL:', publicUrl)

    if (!publicUrl) {
      toast.error('사진 URL을 가져오지 못했습니다.')
      return
    }

    setGoalImageUrl(publicUrl)

    const { error: insertError } = await supabase
      .from('member_goals')
      .insert([{
        member_id: selectedMember.member_id,
        goal_type: 'image',
        content: '',  // NOT NULL 컬럼 대응
        goal_image_url: publicUrl,
        created_at: new Date().toISOString()
      }])

    if (insertError) {
      console.error('Insert error:', insertError)
      toast.error('목표 저장 실패 😥')
      return
    }

    toast.success(t("alert.goal_saveimage"))
  }

  const calculateAchievementRate = (
    base: number | null,    // 목표 기준값
    current: number | null, // 최신 측정값
    gain: number,           // 근육 증가 목표 or 체지방 감소 목표
    type: 'muscle' | 'fat'
  ) => {
    // 1️⃣ 유효성 검사
    if (base === null || current === null || !gain || gain <= 0 || isNaN(gain)) {
      return 0
    }

    let achieved = 0

    // 2️⃣ 계산
    if (type === 'muscle') {
      achieved = ((current - base) / gain) * 100
    } else {
      // fat 감소 목표
      achieved = ((base - current) / gain) * 100
    }

    // 3️⃣ NaN / Infinity 방지
    if (!isFinite(achieved) || isNaN(achieved)) {
      return 0
    }

    // 4️⃣ 0~100 범위 제한 후 소수점 1자리로 반환
    return Math.min(Math.max(achieved, 0), 100).toFixed(1)
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
              {isEditingGoal || hasAnyGoals || goalImageUrl ? (
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

                    
                    <section className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 flex flex-col items-center">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">{t('my.goalImage')}</h3>

                      {/* 목표 사진 미리보기 */}
                      {goalImageUrl ? (
                        <div className="mb-4">
                          <img
                            src={goalImageUrl}
                            alt="Goal Image"
                            className="rounded-xl mx-auto mb-4 max-w-full max-h-[400px] object-contain"
                          />
                        </div>
                      ) : (
                        <p className="text-gray-400 mb-4">
                          {t('goals.noImage')}
                        </p>
                      )}

                      {/* 업로드 버튼 */}
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm rounded-full px-4 py-2 border-gray-400"
                      >
                        {t('goals.imageUpload')}
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleUploadImage}
                      />
                    </section>
                    
                    
                    
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
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 lg:gap-3">
                        {/* 🔹 제목 + 저장일 */}
                        <div className="flex justify-between items-center w-full lg:w-auto">
                          <h3 className="text-lg font-semibold text-gray-600 flex items-center gap-2">
                            <span>📈</span> {t('my.bodycompositionGoal')}
                          </h3>

                          {/* 모바일/패드에서는 제목 옆, 노트북 이상에서는 오른쪽 정렬 */}
                          {lastSavedDate && (
                            <span className="text-xs text-gray-400 text-right lg:ml-3">
                              💾 {t('my.saved')}: {new Date(lastSavedDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* 🔹 버튼 — 모바일/패드에서는 아래줄 오른쪽, 노트북 이상에서는 같은 줄 오른쪽 */}
                        <div className="flex justify-end lg:justify-start w-full lg:w-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs px-3 py-1 border-gray-400 text-gray-600 hover:bg-gray-100"
                            onClick={handleResetGoals}
                          >
                            {t('my.resetGoal')}
                          </Button>
                        </div>
                      </div>



                      {/* 골격근량 */}
                      <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-400 text-lg">•</span>
                          <span className="text-sm">{t('my.bodycompositionGoal_1')}</span>
                          <span className="text-sm text-emerald-600">+</span>
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
                        {/* 1️⃣ 목표 기준값 */}
                        {latestMeasureDate && latestMuscleMass != null && (
                          <div className="text-sm text-gray-700 flex justify-center items-center gap-2">
                            <span className="text-xs text-gray-400">
                              📅 {t('my.baseline')} {new Date(latestMeasureDate).toLocaleDateString('ko-KR')}
                            </span>
                            <span>{latestMuscleMass}kg</span>
                            <span className="font-semibold text-emerald-600">
                              → {latestMuscleMass + muscleGain}kg
                            </span>
                          </div>
                        )}


                        {/* 2️⃣ 최근 측정값 */}
                        {recentMeasureDate && recentMuscleMass != null && (
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 text-center sm:text-left">
                            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-1">
                              <span className="text-sm text-gray-700 leading-relaxed">
                                {t('my.latest')}: {' '}
                                <span className="font-semibold text-emerald-600">{recentMuscleMass}kg</span>{' '}
                                <span className="text-xs text-gray-400">
                                  ({new Date(recentMeasureDate).toLocaleDateString('ko-KR')})
                                </span>
                              </span>
                            </div>

                            {/* ✅ 달성률 — 모바일에서는 아래줄로 떨어짐 */}
                            <div className="text-sm text-gray-700 leading-relaxed mt-1 sm:mt-0">
                              {t('my.progress')}: {' '}
                              <span className="font-semibold text-emerald-600">
                                {calculateAchievementRate(
                                  latestMuscleMass ?? null,
                                  recentMuscleMass,
                                  muscleGain,
                                  'muscle'
                                ) || '0'}%
                              </span>
                            </div>
                          </div>
                        )}


                      </div>

                      {/* 체지방량 */}
                      <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-lg">•</span>
                          <span className="text-sm">{t('my.bodycompositionGoal_3')}</span>
                          <span className="text-sm text-rose-600">-</span>
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
                        {/* 목표 기준값 */}
                        {latestMeasureDate && latestBodyFatMass != null && (
                          <div className="text-sm text-gray-700 flex justify-center items-center gap-2">
                            <span className="text-xs text-gray-400">
                              📅 {t('my.baseline')} {new Date(latestMeasureDate).toLocaleDateString('ko-KR')}
                            </span>
                            <span>{latestBodyFatMass}kg</span>
                            <span className="font-semibold text-rose-600">
                              → {latestBodyFatMass - fatLoss}kg
                            </span>
                          </div>
                        )}

                        {/* 최근 측정값 */}
                        {recentMeasureDate && recentBodyFatMass != null && (
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 text-center sm:text-left">
                            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-1">
                              <span className="text-sm text-gray-700 leading-relaxed">
                                {t('my.latest')}: {' '}
                                <span className="font-semibold text-rose-600">{recentBodyFatMass}kg</span>{' '}
                                <span className="text-xs text-gray-400">
                                  ({new Date(recentMeasureDate).toLocaleDateString('ko-KR')})
                                </span>
                              </span>
                            </div>

                            {/* ✅ 달성률 — 모바일에서는 아래줄로 떨어짐 */}
                            <div className="text-sm text-gray-700 leading-relaxed mt-1 sm:mt-0">
                              {t('my.progress')}: {' '}
                              <span className="font-semibold text-rose-600">
                                {calculateAchievementRate(
                                  latestBodyFatMass ?? null,
                                  recentBodyFatMass,
                                  fatLoss,
                                  'fat'
                                ) || '0'}%
                              </span>
                            </div>
                          </div>
                        )}


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
                    onClick={handleStartGoalSetting} 
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
