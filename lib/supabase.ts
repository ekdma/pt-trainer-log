// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { NewWorkoutRecord, NewHealthMetric, WorkoutType } from '../app/members/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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