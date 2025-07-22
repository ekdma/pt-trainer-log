// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { NewWorkoutRecord, NewHealthMetric, WorkoutType, HealthMetricType } from '../components/members/types'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❗ Supabase 환경변수 누락됨')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
export const serverSupabase  = createClient(supabaseUrl, serviceKey)

export function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// workout_logs 추가
export async function addWorkoutRecordToDB(record: NewWorkoutRecord) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('workout_logs').insert([record])
  if (error) throw new Error(error.message)
}

export async function getWorkoutRecords(memberId: string) {
  const supabase = getSupabaseClient()
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

// supabase.ts 에 추가
export async function getHealthMetrics(memberId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('health_metrics')
    .select('*')
    .eq('member_id', memberId);

  if (error) {
    console.error('❗ Supabase 오류:', error.message);
    throw error;
  }
  return data ?? [];
}

// health_metrics 추가
export async function addHealthMetricsToDB(record: NewHealthMetric) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('health_metrics').insert([record])
  if (error) throw new Error(error.message)
}

// health_metrics 삭제
export async function deleteHealthMetricById(id: number) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('health_metrics')
    .delete()
    .eq('health_id', id);
  if (error) throw error;
}

// workout_log 삭제
export async function deleteWorkoutRecordById(id: number) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('workout_logs')
    .delete()
    .eq('workout_id', id);
  if (error) throw error;
}

export async function getWorkoutTypes(): Promise<WorkoutType[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('workout_types')
    .select('*');

  if (error) {
    console.error('❗ Supabase 오류 (getWorkoutTypes):', error.message);
    throw error;
  }

  return data ?? [];
}

export async function getHealthMetricTypes(): Promise<HealthMetricType[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('health_metric_types')
    .select('*');

  if (error) {
    console.error('❗ Supabase 오류 (getWorkoutTypes):', error.message);
    throw error;
  }

  return data ?? [];
}

// group_session 관련 삭제
export async function deleteGroupSessionDeeply(groupSessionId: number) {
  const supabase = getSupabaseClient()

  // 1. group_session_workouts 삭제
  const { error: error1 } = await supabase
    .from('group_session_workouts')
    .delete()
    .eq('group_session_id', groupSessionId)
  if (error1) throw new Error('group_session_workouts 삭제 실패: ' + error1.message)

  // 2. group_session_participants 삭제
  const { error: error2 } = await supabase
    .from('group_session_participants')
    .delete()
    .eq('group_session_id', groupSessionId)
  if (error2) throw new Error('group_session_participants 삭제 실패: ' + error2.message)

  // 3. group_sessions 삭제
  const { error: error3 } = await supabase
    .from('group_sessions')
    .delete()
    .eq('group_session_id', groupSessionId)
  if (error3) throw new Error('group_sessions 삭제 실패: ' + error3.message)

  return true
}
