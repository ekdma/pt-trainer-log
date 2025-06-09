import { getSupabaseClient } from '../lib/supabase'

export async function fetchWorkoutLogs(member_id: string | number) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('member_id', member_id)
    .order('workout_date', { ascending: true })

  if (error) {
    console.error('Workout fetch error:', error)
    return []
  }

  return data
}

export async function fetchHealthLogs(member_id: string | number) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('health_metrics')
    .select('*')
    .eq('member_id', member_id)
    .order('measure_date', { ascending: true })

  if (error) {
    console.error('Health fetch error:', error)
    return []
  }

  return data
}

