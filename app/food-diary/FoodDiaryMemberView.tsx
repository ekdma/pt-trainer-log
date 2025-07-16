'use client'

import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { getSupabaseClient } from '@/lib/supabase'

interface Props {
  memberId: string
  memberName: string
}

const mealTypes = ['아침', '점심', '간식', '저녁', '간식2']

export default function FoodDiaryMemberView({ memberId, memberName }: Props) {
  const supabase = getSupabaseClient()
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [diary, setDiary] = useState<Record<string, string>>({})
  const [comments, setComments] = useState<Record<string, string>>({})

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
      .select('*')
      .eq('member_id', memberId)
      // 선택된 날짜를 포함하는 기간의 코멘트를 가져오려면
      // start_date <= selectedDate <= end_date 조건 필요
      .lte('start_date', selectedDate.format('YYYY-MM-DD'))
      .gte('end_date', selectedDate.format('YYYY-MM-DD'))
  
    if (error) {
      console.error(error)
      setComments({})
      return
    }
  
    if (data) {
      // data는 여러 객체 배열임 [{start_date, end_date, comments}, ...]
      // 여러 코멘트가 겹칠 수 있으므로 병합해서 처리 (나중에 우선순위 등 따로 처리 가능)
      // 우선 간단하게 가장 최근 코멘트(마지막 데이터)로 덮어쓰기
      let mergedComments: Record<string, string> = {}
  
      data.forEach((item) => {
        mergedComments = { ...mergedComments, ...item.comments }
      })
  
      setComments(mergedComments)
    } else {
      setComments({})
    }
  }

  const handleSave = async () => {
    await supabase.from('food_diaries').upsert({
      member_id: memberId,
      date: selectedDate.format('YYYY-MM-DD'),
      entries: diary,
    })
    alert('식단이 저장되었습니다!')
  }

  useEffect(() => {
    fetchDiary()
    fetchComments()
  }, [selectedDate])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-purple-700">{memberName} 님의 식단일지</h1> 

      <div className="flex justify-between items-center">
        <button onClick={() => setSelectedDate(d => d.subtract(1, 'day'))}>{'<'} 이전</button>
        <h2 className="text-xl font-semibold">{selectedDate.format('YYYY.MM.DD (dd)')}</h2>
        <button onClick={() => setSelectedDate(d => d.add(1, 'day'))}>다음 {'>'}</button>
      </div>

      {mealTypes.map((meal) => (
        <div key={meal} className="space-y-1">
          <label className="block font-semibold">{meal}</label>
          <textarea
            className="w-full border rounded p-2"
            rows={2}
            value={diary[meal] || ''}
            onChange={(e) => setDiary({ ...diary, [meal]: e.target.value })}
          />
          {comments[meal] && <p className="text-sm text-purple-600">💬 {comments[meal]}</p>}
        </div>
      ))}

      <button
        onClick={handleSave}
        className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700"
      >
        저장하기
      </button>
    </div>
  )
}
