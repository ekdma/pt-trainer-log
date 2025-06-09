export type Member = {
  member_id: number
  name: string
  join_date: string
  role: string
  creation_dt: string
  birth_date: string | null
  sex: string
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
export type WorkoutRecord = NewWorkoutRecord & {
  workout_id: number; // Supabase auto-generated PK
};


// 사용자가 입력할 때 사용하는 타입 → ID는 없음
export type NewHealthMetric = {
  member_id: number;
  measure_date: string;
  metric_target: string;
  metric_type: string;
  metric_value: number;
};

// DB에서 조회되거나 삭제/수정에 쓰이는 타입 → ID 있음
export type HealthMetric = NewHealthMetric & {
  health_id: number; // Supabase auto-generated PK
};
