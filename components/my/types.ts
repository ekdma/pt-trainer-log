export type MemberGoal = {
    id: string
    member_id: number
    goal_type: 'diet' | 'hydration' | 'sleep' | 'body'
    content: any
    created_at: string
  }
  