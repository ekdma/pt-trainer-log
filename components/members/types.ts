export type Member = {
  member_id: number
  name: string
  join_date: string
  level: string
  creation_dt: string
  birth_date: string | null
  sex: string
  before_level: string
  modified_dt: string
  role: string
  phone: string
  description: string
  nickname: string
  status: string
}

export type MemberCounsel = {
  member_counsel_id: number
  name: string
  birth_date: string | null
  phone: string
  gender: string
  creation_dt: string
}

export type MemberPackage = {
  member_package_id: number;
  member_id: number;
  package_id: number;
  pt_session_cnt: number;
  group_session_cnt: number;
  self_session_cnt: number;
  price: number;
  start_date: string;
  end_date: string;
  trainer_id: number | null;
  status: string;
  packages?: {
    package_id: number;
    package_name: string;
    valid_date: number;
    pt_session_cnt: number;
    group_session_cnt: number;
    self_session_cnt: number;
    price: number;
  }
  trainers?: {
    trainer_id: number;
    name: string;
  }
};

export type Package = {
  package_id: number;
  package_name: string;
  valid_date: number;
  pt_session_cnt: number;
  group_session_cnt: number;
  self_session_cnt: number;
  price: number;
};

export type Trainer = {
  trainer_id: number;
  name: string;
};

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
  health_id: number;
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


export type WorkoutType = {
  workout_type_id: number;
  target: string;
  workout: string;
  order_target: number;
  order_workout: number;
  level: string;
};

export type HealthMetricType = {
  health_metric_type_id: number;
  metric_target: string;
  metric_type: string;
  order_target: number;
  order_type: number;
};

export interface FoodLog {
  id: number;
  member_id: number;
  date: string; // 'YYYY-MM-DD'
  meal_type: '아침' | '점심' | '저녁' | '간식';
  content: string;
}

export interface FoodComment {
  id: number;
  member_id: number;
  week_start_date: string; // 'YYYY-MM-DD'
  meal_type: '아침' | '점심' | '저녁' | '간식';
  comment: string;
}