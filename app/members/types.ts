export type Member = {
  member_id: number
  name: string
  join_date: string
  role: string
  creation_dt: string
  age: number
}

// 사용자가 입력할 때 사용하는 타입
export type NewWorkoutRecord = {
  member_id: number
  workout_date: string
  target: string
  workout: string
  weight: number
  reps: number
}

// Supabase에서 조회하거나 삽입 결과로 받는 레코드 타입
export type WorkoutRecord = NewWorkoutRecord

export type NewHealthMetric = {
  member_id: number
  measure_date: string // 또는 Date (형식에 따라 조정)
  metric_target: string
  metric_type: string
  metric_value: number
}


export type HealthMetric = NewHealthMetric