'use client'

import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useLanguage } from '@/context/LanguageContext'
import { X, Plus } from 'lucide-react';

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
    <div className="space-y-4">
      <h1 className="text-center text-lg font-semibold text-gray-600">{`${memberName}'s Food Diary`}</h1>
              
      <div className="bg-white shadow rounded-xl p-4 space-y-3 border border-gray-100">
        <div className="flex justify-between items-center">
          <button onClick={() => handleDateChange('prev')} className="text-sm text-rose-600">{'<'} {t('master.previous')}</button>
          <div className="text-center font-semibold">
            {selectedDate.format('YYYY.MM.DD')} ({selectedDate.format('ddd')})
          </div>
          <button onClick={() => handleDateChange('next')} className="text-sm text-rose-600">{t('master.next')} {'>'}</button>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[140px] max-w-xs">
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('my.fastingWeightData')} (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
              placeholder="e.g. 67.5"
            />
          </div>
          <div className="flex-1 min-w-[140px] max-w-xs">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('food_diary.sleepHours')}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
              placeholder="e.g. 7.5"
            />
          </div>
        </div>
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('food_diary.waterIntake')}
          </label>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((index) => (
              <div
                key={index}
                onClick={() =>
                  setHydrationLevel((prev) => (prev === index ? index - 1 : index))
                }
                className="relative w-14 h-16 cursor-pointer"
              >
                {/* 물 채우기 */}
                <div
                  className={`absolute bottom-0 left-0 w-full transition-all duration-300 ${
                    index <= hydrationLevel ? 'bg-blue-400 h-3/4' : 'h-0'
                  }`}
                  style={{
                    opacity: 0.6,
                    borderBottomLeftRadius: '9999px',
                    borderBottomRightRadius: '9999px',
                  }}
                />

                {/* 텀블러 투명 PNG */}
                <img
                  src="/tumbler.png"
                  alt="물컵"
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mealTypes.map((meal) => (
          <div key={meal.key} className="bg-white p-4 rounded-xl shadow border border-gray-100">
            <label className="text-sm  block font-semibold text-gray-800 mb-1">{meal.label}</label>
            <textarea
              className="text-sm w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
              rows={meal.key.includes('Snack') ? 1 : 3}
              value={diary[meal.key] || ''}
              onChange={(e) => setDiary({ ...diary, [meal.key]: e.target.value })}
              placeholder={`${meal.label}${t('food_diary.writeFood')}`}
            />
            
            {/* # 버튼 */}
            <div className="mt-2 mb-2">
              <button
                type="button"
                onClick={() =>
                  setShowHashtags((prev) => ({
                    ...prev,
                    [meal.key]: !prev[meal.key],
                  }))
                }
                className="text-xs text-gray-600 border px-2 py-1 rounded hover:bg-gray-100"
              >
                #
              </button>
            </div>
            
            {showHashtags[meal.key] && (
              <div className="flex flex-wrap gap-2 mb-2">
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
                        setSelectedTags((prev) => ({ ...prev, [meal.key]: updated }))
                      }}
                      className={`text-xs px-2 py-1 rounded-full border transition-all duration-200 whitespace-nowrap ${
                        isSelected
                          ? 'bg-rose-200 border-rose-400 text-rose-800'
                          : 'bg-gray-100 border-gray-300 text-gray-500'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            )}
            
            {comments[meal.key] && (
              <div className="text-xs mt-2 whitespace-pre-line p-2 rounded">
                {/* 트레이너 코멘트 */}
                {(comments[meal.key] || '').split('\n').map((line, i) => (
                  <div
                    key={i}
                    className="💬 bg-rose-50 text-rose-600 p-1 rounded mb-1"
                  >
                    💬 {line.trim()}
                  </div>
                ))}

                {/* 기존 회원 댓글 */}
                {replies[meal.key]?.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center text-xs mt-1 ml-4 p-1 rounded bg-sky-50 text-sky-700"
                  >
                    <div className="flex items-center gap-1">
                      🗨️ {r.reply_text}
                      <span className="text-gray-400 text-[10px] flex items-center gap-1">
                        ({dayjs(r.created_at).format('MM-DD HH:mm')})
                        {r.member_id === Number(memberId) && (
                          <button
                            className="text-red-500 hover:text-red-700 text-xs transition-colors"
                            onClick={async () => {
                              const { error } = await supabase
                                .from('food_comment_replies')
                                .delete()
                                .eq('id', r.id)
                              if (error) {
                                console.error(error)
                              } else {
                                toast.success(t('food_diary.deleteReply'))
                                fetchReplies(currentCommentId!)
                              }
                            }}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </span>
                    </div>
                  </div>
                ))}

                {/* reply 버튼 & 입력은 기존 코드 그대로 */}
                <button
                  className="flex items-center gap-1 text-xs mt-2 ml-2 px-2 py-1 rounded text-blue-600 font-semibold transition-colors"
                  onClick={() =>
                    setShowReplyInput((prev) => ({
                      ...prev,
                      [meal.key]: !prev[meal.key],
                    }))
                  }
                >
                  {showReplyInput[meal.key] ? <X size={12} /> : <Plus size={12} />}
                  <span>Reply</span>
                </button>

                {showReplyInput[meal.key] && (
                  <div className="flex mt-1 gap-2 items-center ml-4">
                    <input
                      type="text"
                      className="flex-1 text-xs p-2 rounded border text-blue-600 border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      placeholder={t('food_diary.writeReply')}
                      value={replyInputs[meal.key] || ''}
                      onChange={(e) =>
                        setReplyInputs((prev) => ({ ...prev, [meal.key]: e.target.value }))
                      }
                    />
                    <button
                      onClick={() => handleSaveReply(meal.key)}
                      className="text-xs text-blue-600 hover:text-blue-800 px-3 py-1 rounded transition-colors"
                    >
                      {t('master.save')}
                    </button>
                  </div>
                )}
              </div>
            )}

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
          variant="darkGray" 
          className="text-sm"
        >
          {t('master.save')}
        </Button>
      </div>

    </div>
  )
}
