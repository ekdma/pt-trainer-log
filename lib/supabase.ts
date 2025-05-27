// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { NewWorkoutRecord } from '../app/members/types' // ← 이 부분이 중요!

// 환경변수는 사용 직전에 가져오기 (빌드 타이밍 문제 회피)
function getClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = getClient()

// DB에 기록 추가
export async function addWorkoutRecordToDB(record: NewWorkoutRecord) {
    const { error } = await supabase.from('workout_logs').insert([record])
    if (error) throw new Error(error.message)
  }
  
  // 멤버별 기록 다시 불러오기
  export async function getWorkoutRecords(memberId: string) {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('member_id', memberId)
  
    if (error) {
    console.error('❗ Supabase 오류:', error.message, error.details)
    throw error
    }
    return data ?? []
  }
  