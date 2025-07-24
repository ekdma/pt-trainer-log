'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import dayjs, { Dayjs } from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import AddCommentTemplateModal from './AddCommentTemplateModal'
import AddHashTagTemplateModal from './AddHashTagTemplateModal'
dayjs.extend(isoWeek)

interface Member {
  member_id: string
  name: string
}

interface FoodDiaryTrainerViewProps {
  initialSelectedMember?: Member | null
}

const mealTypes = [
  { key: 'Breakfast', label: 'Breakfast' },
  { key: 'Snack1', label: 'Snack' },
  { key: 'Lunch', label: 'Lunch' },
  { key: 'Snack2', label: 'Snack' },
  { key: 'Dinner', label: 'Dinner' },
  { key: 'Snack3', label: 'Snack' },
]

export default function FoodDiaryTrainerView({ initialSelectedMember = null }: FoodDiaryTrainerViewProps) {
  const supabase = getSupabaseClient()
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(initialSelectedMember)

  const [baseDate, setBaseDate] = useState<Dayjs>(dayjs()) // ✅ 기준 날짜 상태
  const [weekDates, setWeekDates] = useState<string[]>([])
  const [weekRangeText, setWeekRangeText] = useState<string>('') 
  
  const [diaries, setDiaries] = useState<Record<string, Record<string, string>>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [commentTemplates, setCommentTemplates] = useState<string[]>([]) // 단일 배열로 변경
  const [selectedMealForTemplates, setSelectedMealForTemplates] = useState<string | null>(null)
  const [healthMetrics, setHealthMetrics] = useState<Record<string, Record<string, number>>>({})
  const [availableHashtags, setAvailableHashtags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({}) // { mealType: ['#고지방', '#과자류'] }
  const [showHashtagToggle, setShowHashtagToggle] = useState<Record<string, boolean>>({})

  const getWeekDates = (base: Dayjs) => {
    return Array(7).fill(0).map((_, i) =>
      // base.startOf('isoWeek').add(i, 'day').format('YYYY-MM-DD')
      base.add(i - 3, 'day').format('YYYY-MM-DD')
    )
  }

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active')
    setMembers(data || [])
  }

  const fetchDiaries = async () => {
    if (!selectedMember) return
    const { data } = await supabase
      .from('food_diaries')
      .select('*')
      .eq('member_id', selectedMember.member_id)
      .in('date', weekDates)

    const newDiaries: Record<string, Record<string, string>> = {}
    data?.forEach((entry) => {
      newDiaries[entry.date] = entry.entries || {}
    })
    setDiaries(newDiaries)
  }

  const fetchComments = async () => {
    if (!selectedMember || !baseDate) return
  
    const { data } = await supabase
      .from('food_comments')
      .select('*')
      .eq('member_id', selectedMember.member_id)
      .lte('target_date', baseDate.format('YYYY-MM-DD'))
      .eq('end_date', '9999-12-31') // 현재 유효한 코멘트
      .order('target_date', { ascending: false }) // 가장 가까운 과거부터
      .limit(1)
  
    if (data && data.length > 0) {
      setComments(data[0].comments || {})
    } else {
      setComments({})
    }
  }
  
  const fetchHealthMetrics = async () => {
    if (!selectedMember) return
  
    const { data, error } = await supabase
      .from('health_metrics')
      .select('measure_date, metric_type, metric_value')
      .eq('member_id', selectedMember.member_id)
      .eq('metric_target', 'Overall Fitness')
      .in('metric_type', ['Empty Stomach Weight', 'Sleep Hours', 'Water'])
      .in('measure_date', weekDates)
  
    if (error) {
      console.error('헬스 지표 불러오기 실패:', error)
      return
    }
  
    const metrics: Record<string, Record<string, number>> = {}
  
    data?.forEach(({ measure_date, metric_type, metric_value }) => {
      if (!metrics[metric_type]) {
        metrics[metric_type] = {}
      }
      metrics[metric_type][measure_date] = metric_value
    })
  
    setHealthMetrics(metrics)
  }
  
  const fetchCommentTemplates = async () => {
    const { data, error } = await supabase
      .from('food_comment_templates')
      .select('*')
  
    if (error) {
      console.error('Failed to load templates:', error)
      return
    }
  
    // meal_type과 관계없이 전체 템플릿을 수집
    const templates = data.map(item => item.content)
    setCommentTemplates(templates)
  }

  const fetchAvailableHashtags = async () => {
    const { data, error } = await supabase
      .from('food_hashtag_templates')
      .select('hashtag_content')
      .eq('meal_type', 'common')
      .order('hashtag_content', { ascending: true })

    if (error) {
      console.error('해시태그 템플릿 불러오기 실패:', error)
      setAvailableHashtags([])
      return
    }

    setAvailableHashtags(data?.map(item => item.hashtag_content) || [])
  }

  const fetchExistingHashtags = async () => {
    if (!selectedMember || !baseDate) return
  
    const { data, error } = await supabase
      .from('food_hashtags')
      .select('*')
      .eq('member_id', selectedMember.member_id)
      .in('target_date', weekDates)
  
    if (error) {
      console.error('해시태그 불러오기 실패:', error)
      return
    }
  
    const result: Record<string, string[]> = {}
  
    data?.forEach((row) => {
      const tags = row.hashtags || {}
      for (const mealType in tags) {
        const tagList = Array.isArray(tags[mealType])
          ? tags[mealType]
          : [tags[mealType]] // 혹시 문자열 하나일 경우 대비
        result[`${row.target_date}_${mealType}`] = tagList
      }
    })
  
    setSelectedTags(result)
  }

  useEffect(() => {
    fetchAvailableHashtags()
  }, [])

  // 토글 on/off 핸들러
  const toggleHashtagToggle = (mealType: string) => {
    setShowHashtagToggle(prev => ({
      ...prev,
      [mealType]: !prev[mealType],
    }))
  }

  // 태그 선택/해제 핸들러
  const toggleTagSelect = (mealType: string, tag: string) => {
    setSelectedTags(prev => {
      const currentTags = prev[mealType] || []
      const isSelected = currentTags.includes(tag)
      const updatedTags = isSelected
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag]

      return { ...prev, [mealType]: updatedTags }
    })
  }
  
  const handleSaveComments = async () => {
    if (!selectedMember) return
  
    const today = dayjs().format('YYYY-MM-DD')
  
    const { error } = await supabase.from('food_comments').upsert({
      member_id: selectedMember.member_id,
      start_date: today,
      end_date: '9999-12-31',
      target_date: baseDate.format('YYYY-MM-DD'), // ⚠️ 현재 보고 있는 날짜
      comments,
    }, {
      onConflict: 'member_id,target_date' // 고유성 기준 설정
    })
  
    if (error) {
      console.error('코멘트 저장 실패:', error)
      alert('저장 중 오류 발생!')
    } 
    // else {
    //   alert('코멘트가 저장되었습니다!')
    // }
  }

  const handleSaveHashtags = async () => {
    if (!selectedMember) return
  
    const upserts = Object.entries(selectedTags).map(([key, tags]) => {
      const [date, mealType] = key.split('_')
      return {
        member_id: selectedMember.member_id,
        target_date: date,
        hashtags: { [mealType]: tags },
      }
    })
  
    // 기존 데이터와 합쳐서 mealType 단위로 통합 필요
    const merged: Record<string, {
      member_id: number
      target_date: string
      hashtags: Record<string, string[]>
    }> = {}
  
    upserts.forEach((item) => {
      const key = item.target_date
      if (!merged[key]) {
        merged[key] = {
          member_id: Number(item.member_id),  // 숫자 변환
          target_date: item.target_date,
          hashtags: {},
        }
      }
      merged[key].hashtags = {
        ...merged[key].hashtags,
        ...item.hashtags,
      }
    })
  
    const finalUpserts = Object.values(merged)
  
    const { error } = await supabase.from('food_hashtags').upsert(finalUpserts, {
      onConflict: 'member_id,target_date',
    })
  
    if (error) {
      console.error('해시태그 저장 실패:', error)
      alert('해시태그 저장 실패!')
    } 
    // else {
    //   alert('해시태그가 저장되었습니다!')
    // }
  }

  const handleSaveAll = () => {
    handleSaveComments();
    handleSaveHashtags();
    alert('저장되었습니다 😎')
  };
  
  useEffect(() => {
    fetchMembers()
    fetchCommentTemplates() 
  }, [])

  useEffect(() => {
    setWeekDates(getWeekDates(baseDate))
  
    // weekRangeText는 7일 범위로 변경해서 보여줌
    const start = baseDate.add(-3, 'day')
    const end = baseDate.add(3, 'day')
    setWeekRangeText(`${start.format('YYYY.MM.DD')} ~ ${end.format('MM.DD')}`)
  }, [baseDate])

  useEffect(() => {
    if (weekDates.length === 7 && selectedMember) {
      fetchDiaries()
      fetchComments()
      fetchHealthMetrics() 
      fetchExistingHashtags()
    }
  }, [selectedMember, weekDates])

  useEffect(() => {
    if (members.length > 0 && initialSelectedMember) {
      const found = members.find(m => m.member_id === initialSelectedMember.member_id)
      if (found && found !== selectedMember) {
        setSelectedMember(found)
      }
    }
  }, [members, initialSelectedMember])

  return (
    <div className="space-y-6 p-4 md:p-6 bg-white rounded-lg shadow-md">
      <select
        value={selectedMember?.member_id || ''}
        onChange={(e) => {
          const selectedId = e.target.value
          const m = members.find(m => String(m.member_id) === selectedId)
          setSelectedMember(m || null)
          setComments({})
        }}
        className="
          block w-full max-w-md px-4 py-2 text-base
          border border-gray-300 rounded-md bg-white text-gray-700
          focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent
          transition duration-200 hover:border-rose-400 cursor-pointer
        "
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


      {members.length === 0 && <p>회원 데이터가 없습니다.</p>}

      {selectedMember && (
        <div className="overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => setBaseDate(baseDate.subtract(7, 'day'))} className="text-sm text-gray-600">{'<'}</button>
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                {`${selectedMember.name}'s Food Diary`}
              </h3>
              <p className="text-sm text-gray-500">{weekRangeText}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBaseDate(dayjs())}
                className="text-xs px-2 py-1 border border-rose-500 text-rose-600 rounded hover:bg-rose-100"
              >
                today
              </button>
              <button onClick={() => setBaseDate(baseDate.add(7, 'day'))} className="text-sm text-gray-600">{'>'}</button>
            </div>
          </div>
          {/* <p className="text-center text-sm text-gray-600 mt-2">
            선택된 날짜: <span className="font-semibold text-rose-600">{baseDate.format('YYYY년 M월 D일 (ddd)')}</span>
          </p> */}
          <table className="w-full table-fixed border text-sm border-collapse rounded overflow-hidden shadow-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1 bg-gray-200">구분</th>
                {weekDates.map((d) => {
                  const isToday = dayjs().format('YYYY-MM-DD') === d
                  const isCenter = baseDate.format('YYYY-MM-DD') === d

                  return (
                    <th
                      key={d}
                      onClick={() => setBaseDate(dayjs(d))} // ✅ 클릭 시 날짜 선택
                      className={`
                       bg-gray-100 px-2 py-1 whitespace-nowrap text-sm cursor-pointer
                        ${isToday ? 'bg-rose-100 text-rose-700' : ''}
                        ${isCenter ? 'bg-pink-100 font-bold text-pink-700 border-2 border-pink-500' : ''}
                        hover:bg-pink-50
                      `}
                    >
                      {dayjs(d).format('DD(ddd)')}
                    </th>

                  )
                })}
              </tr>
            </thead>
            
            <tbody>
              {[
                { label: '공복체중(kg)', type: 'Empty Stomach Weight', bg: 'bg-yellow-100', text: 'text-yellow-800', cell: 'bg-yellow-50' },
                { label: '수면시간(h)', type: 'Sleep Hours', bg: 'bg-emerald-100', text: 'text-emerald-800', cell: 'bg-emerald-50' },
                { label: '수분섭취(컵)', type: 'Water', bg: 'bg-blue-100', text: 'text-blue-800', cell: 'bg-blue-50' },
              ].map(({ label, type, bg, text, cell }) => (
                <tr key={type}>
                  <td className={`${bg} border px-2 py-1 text-center font-semibold ${text}`}>
                    {label}
                  </td>
                  {weekDates.map((d) => (
                    <td key={d} className={`border px-2 py-1 text-center text-sm ${cell} text-gray-800`}>
                      {healthMetrics[type]?.[d] !== undefined ? healthMetrics[type][d].toFixed(1) : '-'}
                    </td>
                  ))}
                </tr>
              ))}

              {mealTypes.map((meal) => (
                <tr key={meal.key}>
                  <td className="bg-gray-200 border px-2 py-1 text-center font-semibold">{meal.label}</td>
                  {weekDates.map((d) => (
                    <td key={d} className="border px-2 py-1 align-top text-center relative">

                      {/* 식단 내용 출력 */}
                      <div>{diaries[d]?.[meal.key] || '-'}</div>

                      {/* # 버튼 */}
                      <button
                        type="button"
                        onClick={() => toggleHashtagToggle(`${d}_${meal.key}`)}
                        className="mt-1 text-xs text-gray-600 border px-1 py-0.5 rounded hover:bg-gray-100"
                      >
                        #
                      </button>

                      {/* 해시태그 토글 UI */}
                      {showHashtagToggle[`${d}_${meal.key}`] && (
                        <div className="flex flex-wrap gap-1 mt-1 max-w-xs border rounded p-1 bg-white shadow-md absolute z-10">
                          {availableHashtags.length === 0 ? (
                            <p className="text-xs text-gray-400">해시태그가 없습니다.</p>
                          ) : (
                            availableHashtags.map((tag) => {
                              const isSelected = selectedTags[`${d}_${meal.key}`]?.includes(tag)
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => toggleTagSelect(`${d}_${meal.key}`, tag)}
                                  className={clsx(
                                    'text-xs px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap',
                                    isSelected
                                      ? 'bg-rose-200 border-rose-400 text-rose-800 font-semibold'
                                      : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-rose-50'
                                  )}
                                >
                                  {tag}
                                </button>
                              )
                            })
                          )}
                        </div>
                      )}

                      {/* 선택된 태그 표시 (버튼 토글 외, 읽기용) */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(selectedTags[`${d}_${meal.key}`] || []).map(tag => (
                          <span
                            key={tag}
                            className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full select-none"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                    </td>
                  ))}
                </tr>
              ))}

              {mealTypes.map((meal) => (
                <tr
                  key={`${meal.key}-comment`}
                  className={clsx(
                    selectedMealForTemplates === meal.key && 'bg-rose-50'
                  )}
                >
                  <td className="border px-2 py-1 text-center text-rose-700">💬 {meal.label}</td>
                  <td colSpan={7} className="border px-2 py-1">
                    <textarea
                      rows={2}
                      className="
                        w-full max-w-full border border-gray-300 rounded
                        p-2 mt-1 resize-none text-sm
                        focus:ring-2 focus:ring-rose-500 focus:outline-none
                      "
                      placeholder="코멘트를 입력하세요"
                      value={comments[meal.key] || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        setComments({ ...comments, [meal.key]: value })
                      }}
                      onFocus={() => setSelectedMealForTemplates(meal.key)}
                    />

                    {selectedMealForTemplates === meal.key && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[...commentTemplates]
                          .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                          .map((template, idx) => {
                            const isSelected = (comments[meal.key] || '').includes(template)
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  const current = comments[meal.key] || ''
                                  const lines = current.split('\n').map(s => s.trim()).filter(Boolean)

                                  let updated: string
                                  if (lines.includes(template)) {
                                    // 이미 있는 경우 → 제거
                                    updated = lines.filter(t => t !== template).join('\n')
                                  } else {
                                    // 없는 경우 → 추가 (줄바꿈으로 추가)
                                    updated = [...lines, template].join('\n')
                                  }

                                  setComments({ ...comments, [meal.key]: updated })
                                }}
                                className={clsx(
                                  'px-3 py-1 text-sm rounded-full border transition-all',
                                  isSelected
                                    ? 'bg-rose-100 border-rose-400 text-rose-700 font-semibold'
                                    : 'bg-gray-100 hover:bg-rose-50 border-gray-300'
                                )}
                              >
                                {template}
                              </button>
                            )
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
          <div className="mt-6 flex justify-end items-center gap-4">
            <div className="flex items-center gap-2">
              <AddCommentTemplateModal
                onTemplateAdded={(text) => {
                  setCommentTemplates((prev) => [...prev, text])
                }}
                onTemplateDeleted={(text) => {
                  setCommentTemplates((prev) => prev.filter(t => t !== text))
                }}
              />
              <AddHashTagTemplateModal
                trainerId="1"
                onTemplateAdded={(text) => {
                  // 필요 시 상태 업데이트 로직 추가
                  console.log('해시태그 템플릿 추가됨:', text)
                }}
                onTemplateDeleted={(text) => {
                  // 필요 시 상태 업데이트 로직 추가
                  console.log('해시태그 템플릿 삭제됨:', text)
                }}
              />
              <Button
                onClick={handleSaveAll}
                variant="darkGray" 
                className="text-sm"
                // type="submit"
                // className="bg-rose-600 hover:bg-rose-700 text-white text-sm"
              >
                저장
              </Button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
