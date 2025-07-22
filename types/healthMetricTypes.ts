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
  }

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
  
  export type HealthMetricType = {
    health_metric_type_id: number;
    metric_target: string;
    metric_type: string;
    order_target?: number;
    order_type?: number;
  };
  