'use client'

import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useLanguage } from '@/context/LanguageContext'
import { X, Send, MessageCircleMore } from 'lucide-react';
// import { ChatBubbleLeftIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid'

interface Props {
  memberId: string
  memberName: string
}

interface Reply {
  id: number
  member_id: number
  meal_type: string
  reply_text: string
  created_at: string
}

const mealTypes = [
  { key: 'Breakfast', label: 'Breakfast' },
  { key: 'Snack1', label: 'Snack' },
  { key: 'Lunch', label: 'Lunch' },
  { key: 'Snack2', label: 'Snack' },
  { key: 'Dinner', label: 'Dinner' },
  { key: 'Snack3', label: 'Snack' },
]

export default function FoodDiaryMemberView({ memberId, memberName }: Props) {
  const supabase = getSupabaseClient()
  const { t } = useLanguage()  // 번역 함수 가져오기
  
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [diary, setDiary] = useState<Record<string, string>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  
  const [replies, setReplies] = useState<Record<string, Reply[]>>({})
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({})
  const [currentCommentId, setCurrentCommentId] = useState<number | null>(null)
  const [showReplyInput, setShowReplyInput] = useState<Record<string, boolean>>({})
  
  const today = dayjs()
  const maxPast = today.subtract(7, 'day')
  const maxFuture = today.add(7, 'day')

  const [weight, setWeight] = useState<string>('')
  const [sleepHours, setSleepHours] = useState<string>('')
  const [hydrationLevel, setHydrationLevel] = useState<number>(0) // 0~4 컵
  const [availableHashtags, setAvailableHashtags] = useState<Record<string, string[]>>({})
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({})
  const [showHashtags, setShowHashtags] = useState<Record<string, boolean>>({})


  const fetchHealthMetrics = async () => {
    const { data, error } = await supabase
      .from('health_metrics')
      .select('metric_type, metric_value')
      .eq('member_id', memberId)
      .eq('measure_date', selectedDate.format('YYYY-MM-DD'))
  
    if (error) {
      console.error(error)
      setWeight('')
      setSleepHours('')
      setHydrationLevel(0)
      return
    }
  
    // 초기화
    setWeight('')
    setSleepHours('')
    setHydrationLevel(0)
  
    data?.forEach((row) => {
      const { metric_type, metric_value } = row
      switch (metric_type) {
        case 'Fasting Weight Data':
          setWeight(String(metric_value))
          break
        case 'Sleep Hours':
          setSleepHours(String(metric_value))
          break
        case 'Water':
          setHydrationLevel(Number(metric_value))
          break
        default:
          break
      }
    })
  }

  const fetchDiary = async () => {
    const { data, error } = await supabase
      .from('food_diaries')
      .select('*')
      .eq('member_id', memberId)
      .eq('date', selectedDate.format('YYYY-MM-DD'))
      .single()

    if (error) {
      console.error(error)
      setDiary({})
      return
    }

    if (data) {
      setDiary(data.entries || {})
    } else {
      setDiary({})
    }
  }

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('food_comments')
      .select('id, target_date, comments')
      .eq('member_id', memberId)
      .lte('target_date', selectedDate.format('YYYY-MM-DD'))
      .order('target_date', { ascending: false })
      .limit(1)

    if (error) {
      console.error(error)
      setComments({})
      return
    }

    if (data && data.length > 0) {
      setCurrentCommentId(data[0].id)
      setComments(JSON.parse(data[0].comments || '{}'))
      fetchReplies(data[0].id)
    } else {
      setComments({})
    }
  }

  const fetchAvailableHashtags = async () => {
    const { data, error } = await supabase
      .from('food_hashtag_templates')
      .select('hashtag_content')
      .eq('meal_type', 'common')  // << 여기!
  
    if (error) {
      console.error(error)
      setAvailableHashtags({})
      return
    }
  
    // 모든 mealType에 공통 태그를 복사해서 할당
    const commonTags = data?.map((item) => item.hashtag_content) || {}
    const grouped: Record<string, string[]> = {}
    mealTypes.forEach(({ key }) => {
      grouped[key] = [...commonTags]
    })
  
    setAvailableHashtags(grouped)
  }

  const fetchSelectedHashtags = async () => {
    const { data, error } = await supabase
      .from('food_hashtags')
      .select('hashtags')
      .eq('member_id', memberId)
      .eq('target_date', selectedDate.format('YYYY-MM-DD'))
      .single()

    if (error) {
      console.error(error)
      setSelectedTags({})
      return
    }

    setSelectedTags(data?.hashtags || {})
  }

  const saveSelectedHashtags = async () => {
    const payload = {
      member_id: memberId,
      target_date: selectedDate.format('YYYY-MM-DD'),
      hashtags: selectedTags,
    }
  
    console.log('🔄 해시태그 저장 시도 중 (payload):', payload)
  
    const { error, data } = await supabase.from('food_hashtags').upsert(
      [payload],
      { onConflict: 'member_id,target_date' }
    )
  
    if (error) {
      console.error('❌ 해시태그 저장 실패:', error)
    } else {
      console.log('✅ 해시태그 저장 성공:', data)
    }
  }
  

  const handleSave = async () => {
    await supabase.from('food_diaries').upsert({
      member_id: memberId,
      date: selectedDate.format('YYYY-MM-DD'),
      entries: diary,
    })
  
    const healthMetricsPayload = []

    if (weight) {
      healthMetricsPayload.push({
        member_id: memberId,
        measure_date: selectedDate.format('YYYY-MM-DD'),
        metric_target: 'Overall Fitness',
        metric_type: 'Fasting Weight Data',
        metric_value: parseFloat(weight),
      })
    }

    if (sleepHours) {
      healthMetricsPayload.push({
        member_id: memberId,
        measure_date: selectedDate.format('YYYY-MM-DD'),
        metric_target: 'Overall Fitness',
        metric_type: 'Sleep Hours',
        metric_value: parseFloat(sleepHours),
      })
    }

    // hydrationLevel은 0도 유효하므로 undefined 확인
    if (hydrationLevel !== undefined) {
      healthMetricsPayload.push({
        member_id: memberId,
        measure_date: selectedDate.format('YYYY-MM-DD'),
        metric_target: 'Overall Fitness',
        metric_type: 'Water',
        metric_value: hydrationLevel,
      })
    }

    if (healthMetricsPayload.length > 0) {
      const { error } = await supabase
        .from('health_metrics')
        .upsert(healthMetricsPayload, {
          onConflict: 'member_id,measure_date,metric_type',
        })

      if (error) {
        console.error('❌ 헬스 메트릭 저장 실패:', error)
      }
    }

    await saveSelectedHashtags()
    toast.success(t('alert.diet_save'))
    // alert('저장되었습니다 💪')
  }

  const handleDateChange = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev'
      ? selectedDate.subtract(1, 'day')
      : selectedDate.add(1, 'day')
  
    if (newDate.isBefore(maxPast) || newDate.isAfter(maxFuture)) {
      toast.warning(t('alert.diet_warning'))
      // alert('7일 이내의 입력만 가능합니다')
      return
    }
  
    setSelectedDate(newDate)
  }

  useEffect(() => {
    fetchDiary()
    fetchComments()
    fetchHealthMetrics()
    fetchAvailableHashtags()
    fetchSelectedHashtags()
  }, [selectedDate])

  // 댓글 불러오기
  const fetchReplies = async (commentId: number) => {
    if (!commentId) return
    const { data, error } = await supabase
      .from('food_comment_replies')
      .select('*')
      .eq('food_comment_id', commentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    // meal_type 별로 그룹화
    const grouped: Record<string, Reply[]> = {}
    data?.forEach((r) => {
      if (!grouped[r.meal_type]) grouped[r.meal_type] = []
      grouped[r.meal_type].push(r)
    })
    setReplies(grouped)
  }

  // 댓글 저장
  const handleSaveReply = async (mealType: string) => {
    if (!currentCommentId || !replyInputs[mealType]) return
    const { error } = await supabase
      .from('food_comment_replies')
      .insert([
        {
          food_comment_id: currentCommentId,
          member_id: Number(memberId),
          meal_type: mealType,
          reply_text: replyInputs[mealType],
        },
      ])
      .select() // select() 사용해도 error만 필요하면 data 무시 가능

    if (error) {
      console.error(error)
      return
    }

    setReplyInputs((prev) => ({ ...prev, [mealType]: '' }))
    fetchReplies(currentCommentId)
    toast.success(t('food_diary.saveReply'))
  }
  
  return (
    <div className="space-y-6 p-3 sm:p-4">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          {`${memberName}'s Food Diary`}
        </h1>
      </div>
      <div className="h-[2px] w-20 bg-gradient-to-r from-rose-400 to-pink-300 mx-auto mt-1 mb-4 rounded-full" />
              
      {/* 📅 날짜 + 기본정보 */}
      <div className="relative bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-rose-100">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-rose-50/50 via-transparent to-blue-50/50 pointer-events-none z-0" />
        {/* 날짜 이동 */}
        <div className="flex justify-between items-center text-sm font-medium text-gray-600 relative z-5">
          <button
            onClick={() => handleDateChange('prev')}
            className="px-3 py-1 rounded-full bg-white text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition"
          >
            ‹ {t('master.previous')}
          </button>

          <div className="text-center">
            <div className="text-xl font-bold text-gray-800">{selectedDate.format('YYYY.MM.DD')}</div>
            <div className="text-sm font-semibold text-gray-500">{selectedDate.format('ddd')}</div>
          </div>

          <button
            onClick={() => handleDateChange('next')}
            className="px-3 py-1 rounded-full bg-white text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition"
          >
            {t('master.next')} ›
          </button>
        </div>

        {/* 건강 지표 카드들 */}
        <div className="grid grid-cols-2 gap-3 mt-3 relative z-5">
          {/* 체중 */}
          <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-inner hover:shadow-md transition-all duration-300 z-5">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              ⚖️ {t('my.fastingWeightData')}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-300 transition text-gray-800"
              placeholder="67.5"
            />
          </div>

          {/* 수면 */}
          <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-inner hover:shadow-md transition-all duration-300 z-5">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              😴 {t('food_diary.sleepHours')}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 transition text-gray-800"
              placeholder="7.5"
            />
          </div>
        </div>

        {/* 수분 섹션 */}
        <div className="mt-4 relative z-5">
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            💧 {t('food_diary.waterIntake')}
          </label>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4].map((index) => (
              <div
                key={index}
                onClick={() =>
                  setHydrationLevel((prev) => (prev === index ? index - 1 : index))
                }
                // ✅ 클릭할 때도 살짝 커지는 애니메이션 유지
                className={`relative w-12 h-16 cursor-pointer transform transition-transform duration-200 
                  ${index <= hydrationLevel ? 'scale-105' : 'hover:scale-110 active:scale-95'}`}
              >
                <div
                  className={`absolute bottom-0 left-0 w-full transition-all duration-500 ${
                    index <= hydrationLevel
                      ? 'bg-gradient-to-t from-blue-500 to-blue-200 h-3/4'
                      : 'h-0'
                  }`}
                  style={{
                    opacity: 0.8,
                    borderBottomLeftRadius: '9999px',
                    borderBottomRightRadius: '9999px',
                  }}
                />
                <img
                  src="/tumbler.png"
                  alt="water"
                  className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-95 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            {hydrationLevel} / 4
          </p>
        </div>


      </div>

      {/* 🥗 식사 섹션 */}
      <div className="mt-6 space-y-6">
        {[
          { title: '🌅 Morning', meals: ['Breakfast', 'Snack1'], bg: 'from-amber-50 to-white' },
          { title: '☀️ Afternoon', meals: ['Lunch', 'Snack2'], bg: 'from-green-50 to-white' },
          { title: '🌙 Evening', meals: ['Dinner', 'Snack3'], bg: 'from-blue-50 to-white' },
        ].map((group) => (
          <div
            key={group.title}
            className={`p-4 rounded-2xl bg-gradient-to-b ${group.bg} shadow-sm border border-gray-100 space-y-4`}
          >
            {/* 그룹 헤더 */}
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-rose-300 rounded-full"></div>
              <h3 className="text-base font-bold text-gray-700">{group.title}</h3>
            </div>

            {/* 그룹 내 식사 카드들 */}
            {group.meals.map((mealKey) => {
              const meal = mealTypes.find((m) => m.key === mealKey)
              if (!meal) return null

              return (
                <div
                  key={meal.key}
                  className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4"
                >
                  {/* 제목 */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
                      <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-pink-50 text-lg shadow-inner ring-1 ring-rose-100">
                        {meal.key.includes('Breakfast') && '🍳'}
                        {meal.key.includes('Lunch') && '🍚'}
                        {meal.key.includes('Dinner') && '🥗'}
                        {meal.key.includes('Snack') && '☕'}
                      </div>
                      <span>{meal.label}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setShowHashtags((prev) => ({
                          ...prev,
                          [meal.key]: !prev[meal.key],
                        }))
                      }
                      className="text-xs text-gray-500 border border-gray-300 rounded-full px-2 py-0.5 hover:bg-gray-100"
                    >
                      #
                    </button>
                  </div>

                  {/* 입력창 */}
                  <textarea
                    className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-rose-300 transition placeholder-gray-400"
                    rows={meal.key.includes('Snack') ? 2 : 3}
                    value={diary[meal.key] || ''}
                    onChange={(e) => setDiary({ ...diary, [meal.key]: e.target.value })}
                    placeholder={`${meal.label}${t('food_diary.writeFood')}`}
                  />

                  {/* 해시태그 */}
                  {showHashtags[meal.key] && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {availableHashtags[meal.key]?.map((tag) => {
                        const isSelected = selectedTags[meal.key]?.includes(tag)
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              const current = selectedTags[meal.key] || []
                              const updated = isSelected
                                ? current.filter((t) => t !== tag)
                                : [...current, tag]
                              setSelectedTags((prev) => ({
                                ...prev,
                                [meal.key]: updated,
                              }))
                            }}
                            className={`text-xs px-3 py-1 rounded-full border transition-all duration-200 font-medium ${
                              isSelected
                                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* 코멘트 및 리플 */}
                  {comments[meal.key] && (
                    <div className="mt-3 space-y-2">
                      {(comments[meal.key] || '').split('\n').map((line, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 bg-gradient-to-r from-rose-50 to-white border border-rose-100 rounded-2xl p-3 text-[13px] text-gray-700 shadow-sm"
                        >
                          <div className="w-6 h-6 flex items-center justify-center bg-rose-100 text-rose-600 rounded-full flex-shrink-0">
                            <MessageCircleMore className="w-3.5 h-3.5" />
                          </div>
                          <span className="leading-snug">{line.trim()}</span>
                        </div>
                      ))}

                      {/* 리플 (회원 답글) */}
                      {replies[meal.key]?.map((r) => (
                        <div
                          key={r.id}
                          className="ml-6 flex items-start gap-2 bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-2xl p-2.5 text-[12px] text-gray-700 shadow-sm"
                        >
                          {/* 아이콘 */}
                          <div className="w-6 h-6 flex items-center justify-center bg-blue-50 text-blue-500 rounded-full flex-shrink-0">
                            <Send className="w-3 h-3 rotate-45" />
                          </div>

                          {/* 내용 + 버튼 정렬 영역 */}
                          <div className="flex-1 flex justify-between items-start">
                            <div className="pr-2">
                              <span>{r.reply_text}</span>
                              <div className="text-gray-400 text-[10px] mt-0.5">
                                {dayjs(r.created_at).format('MM-DD HH:mm')}
                              </div>
                            </div>

                            {/* X 버튼 (오른쪽 정렬, 텍스트 침범 안 함) */}
                            {r.member_id === Number(memberId) && (
                              <button
                                className="ml-2 text-blue-700 hover:text-red-500 transition flex-shrink-0 mt-[2px]"
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from('food_comment_replies')
                                    .delete()
                                    .eq('id', r.id);
                                  if (!error) {
                                    toast.success(t('food_diary.deleteReply'));
                                    fetchReplies(currentCommentId!);
                                  }
                                }}
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Reply 입력 */}
                      <div className="mt-2 ml-3">
                        <button
                          className="flex items-center gap-1 text-[11px] text-blue-600 font-medium hover:text-blue-800 transition"
                          onClick={() =>
                            setShowReplyInput((prev) => ({
                              ...prev,
                              [meal.key]: !prev[meal.key],
                            }))
                          }
                        >
                          {showReplyInput[meal.key] ? (
                            <>
                              <X size={11} className="text-bold text-blue-800" /> {t('master.close')}
                            </>
                          ) : (
                            <>
                              <MessageCircleMore size={12} className="text-blue-500" /> {t("food_diary.reply")}
                            </>
                          )}
                        </button>

                        {showReplyInput[meal.key] && (
                          <div className="relative mt-2 ml-3">
                            <input
                              type="text"
                              className="
                                w-full text-[12px] px-3 pr-10 py-2 
                                rounded-full border border-gray-200 bg-gray-50 text-gray-700 
                                focus:ring-1 focus:ring-blue-200 focus:border-blue-300 
                                transition-all placeholder:text-gray-400
                              "
                              placeholder={t('food_diary.writeReply')}
                              value={replyInputs[meal.key] || ''}
                              onChange={(e) =>
                                setReplyInputs((prev) => ({
                                  ...prev,
                                  [meal.key]: e.target.value,
                                }))
                              }
                            />
                            <button
                              onClick={() => handleSaveReply(meal.key)}
                              className="
                                absolute right-2 top-1/2 -translate-y-1/2 
                                bg-blue-500 text-white rounded-full p-1.5 
                                hover:bg-blue-600 active:scale-95 
                                shadow-sm transition
                              "
                            >
                              <Send size={13} className="rotate-45 translate-x-[0.5px]" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>


      <div className="text-center">
        {/* <button
          onClick={handleSave}
          className="text-sm mt-6 bg-rose-600 text-white font-semibold px-6 py-3 rounded-full shadow hover:bg-rose-700 transition"
        >
          저장
        </button> */}
        <Button
          onClick={handleSave}
          className="text-sm bg-rose-500 text-white font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all rounded-full px-6 py-3 fixed bottom-6 left-1/2 -translate-x-1/2 ring-2 ring-rose-100 backdrop-blur-sm"
        >
          💾 {t('master.save')}
        </Button>
      </div>

    </div>
  )
}
