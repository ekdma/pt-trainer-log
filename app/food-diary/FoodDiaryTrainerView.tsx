'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import dayjs, { Dayjs } from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

interface Member {
  member_id: string
  name: string
}

interface FoodDiaryTrainerViewProps {
  initialSelectedMember?: Member | null
}

const mealTypes = ['아침', '점심', '간식', '저녁', '간식2']

export default function FoodDiaryTrainerView({ initialSelectedMember = null }: FoodDiaryTrainerViewProps) {
  const supabase = getSupabaseClient()
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(initialSelectedMember)

  const [baseDate, setBaseDate] = useState<Dayjs>(dayjs()) // ✅ 기준 날짜 상태
  const [weekDates, setWeekDates] = useState<string[]>([])
  const [weekRangeText, setWeekRangeText] = useState<string>('') 
  
  const [diaries, setDiaries] = useState<Record<string, Record<string, string>>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [commentTemplates, setCommentTemplates] = useState<Record<string, string[]>>({})
  const [showTemplateInput, setShowTemplateInput] = useState<Record<string, boolean>>({})
  const [newTemplateText, setNewTemplateText] = useState<Record<string, string>>({})
  
  const getWeekDates = (base: Dayjs) => {
    return Array(7).fill(0).map((_, i) =>
      base.startOf('isoWeek').add(i, 'day').format('YYYY-MM-DD')
    )
  }

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*')
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
    if (!selectedMember || weekDates.length < 1) return
    const { data } = await supabase
      .from('food_comments')
      .select('*')
      .eq('member_id', selectedMember.member_id)
      .eq('start_date', weekDates[0])
      .eq('end_date', weekDates[6])
      .single()

    if (data) {
      setComments(data.comments || {})
    } else {
      setComments({})
    }
  }

  const fetchCommentTemplates = async () => {
    const { data, error } = await supabase
      .from('food_comment_templates')
      .select('*')
  
    if (error) {
      console.error('Failed to load templates:', error)
      return
    }
  
    const grouped = data.reduce((acc: Record<string, string[]>, item) => {
      if (!acc[item.meal_type]) acc[item.meal_type] = []
      acc[item.meal_type].push(item.content)
      return acc
    }, {})
  
    setCommentTemplates(grouped)
  }
  
  const handleSaveComments = async () => {
    if (!selectedMember) return
    await supabase.from('food_comments').upsert({
      member_id: selectedMember.member_id,
      start_date: weekDates[0],
      end_date: weekDates[6],
      comments,
    })
    alert('코멘트가 저장되었습니다!')
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    const start = baseDate.startOf('isoWeek')
    const end = baseDate.endOf('isoWeek')
    setWeekDates(getWeekDates(baseDate))
    setWeekRangeText(`${start.format('YYYY.MM.DD')} ~ ${end.format('MM.DD')}`) // ✅ 주간 텍스트 설정
  }, [baseDate])

  useEffect(() => {
    if (weekDates.length === 7 && selectedMember) {
      fetchDiaries()
      fetchComments()
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
    <div className="space-y-6">
      <select
        value={selectedMember?.member_id || ''}
        onChange={(e) => {
          const selectedId = e.target.value
          const m = members.find(m => String(m.member_id) === selectedId)
          setSelectedMember(m || null)
          setComments({})
        }}
        className="
          block
          w-full
          max-w-md
          px-4
          py-2
          border
          border-gray-300
          rounded-md
          bg-white
          text-gray-700
          shadow-sm
          focus:outline-none
          focus:ring-2
          focus:ring-purple-500
          focus:border-transparent
          transition
          duration-200
          hover:border-purple-400
          cursor-pointer
        "
      >
        <option value="">회원 선택</option>
        {members.map((m) => (
          <option key={m.member_id} value={m.member_id}>
            {m.name}
          </option>
        ))}
      </select>


      {members.length === 0 && <p>회원 데이터가 없습니다.</p>}

      {selectedMember && (
        <div className="overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => setBaseDate(baseDate.subtract(1, 'week'))} className="text-sm text-gray-600">{'<'}</button>
            <div className="text-center">
              <h3 className="text-lg font-semibold">{selectedMember.name}님의 식단 (주간)</h3>
              <p className="text-sm text-gray-500">{weekRangeText}</p> {/* ✅ 주간 범위 표시 */}
            </div>
            <button onClick={() => setBaseDate(baseDate.add(1, 'week'))} className="text-sm text-gray-600">{'>'}</button>
          </div>

          <table className="w-full border text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">구분</th>
                {weekDates.map((d) => (
                  <th key={d} className="border px-2 py-1 whitespace-nowrap">
                    {dayjs(d).format('DD(ddd)')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mealTypes.map((meal) => (
                <tr key={meal}>
                  <td className="border px-2 py-1 font-medium text-right">{meal}</td>
                  {weekDates.map((d) => (
                    <td key={d} className="border px-2 py-1 align-top">
                      {diaries[d]?.[meal] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
              {mealTypes.map((meal) => (
                <tr key={`${meal}-comment`}>
                  <td className="border px-2 py-1 text-right text-purple-700">💬 {meal} 코멘트</td>
                  <td colSpan={7} className="border px-2 py-1">
                    <input
                      type="text"
                      className="w-full border rounded p-1"
                      placeholder="코멘트를 입력하세요"
                      value={comments[meal] || ''}
                      onChange={(e) => setComments({ ...comments, [meal]: e.target.value })}
                    />
                    {/* ✅ 템플릿 토글 버튼 */}
                    <div className="flex flex-wrap gap-2">
                      {(commentTemplates[meal] || []).map((template, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const current = comments[meal] || ''
                            const selected = template
                            const tokens = current.split(' ').filter(Boolean)
                            if (!tokens.includes(selected)) {
                              const updated = [...tokens, selected].join(' ')
                              setComments({ ...comments, [meal]: updated })
                            }
                          }}
                          className={`px-2 py-1 text-sm rounded border ${
                            (comments[meal] || '').includes(template)
                              ? 'bg-purple-200 border-purple-400 text-purple-800'
                              : 'bg-gray-100 hover:bg-purple-100 border-gray-300'
                          }`}
                        >
                          {template}
                        </button>
                      ))}
                    </div>
                    {/* ✅ 코멘트 추가 입력창 토글 */}
                    {showTemplateInput[meal] ? (
                      <div className="flex gap-2 items-center mt-1">
                        <input
                          className="border p-1 rounded w-full"
                          value={newTemplateText[meal] || ''}
                          placeholder="새 코멘트를 입력하세요"
                          onChange={(e) =>
                            setNewTemplateText({ ...newTemplateText, [meal]: e.target.value })
                          }
                        />
                        <button
                          onClick={async () => {
                            const text = newTemplateText[meal]?.trim()
                            if (!text) return
                            const { error } = await supabase.from('food_comment_templates').insert({
                              meal_type: meal,
                              content: text,
                            })
                            if (!error) {
                              setCommentTemplates((prev) => ({
                                ...prev,
                                [meal]: [...(prev[meal] || []), text],
                              }))
                              setNewTemplateText({ ...newTemplateText, [meal]: '' })
                              setShowTemplateInput({ ...showTemplateInput, [meal]: false })
                            }
                          }}
                          className="bg-indigo-500 text-white px-2 py-1 rounded"
                        >
                          저장
                        </button>
                      </div>
                    ) : (
                      <button
                        className="text-sm text-indigo-600 mt-1"
                        onClick={() => setShowTemplateInput({ ...showTemplateInput, [meal]: true })}
                      >
                        + 코멘트 추가
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={handleSaveComments}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            코멘트 저장하기
          </button>
        </div>
      )}
    </div>
  )
}
