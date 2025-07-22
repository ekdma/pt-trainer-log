export interface RawGroupSession {
    group_session_id: number;
    group_session_date: string;
    theme: string;
    trainer_id: number;
    trainer: { name: string | null } | null;
    workouts: { workout_name: string }[] | null;
    participants: { members: { name: string } | null }[] | null;
  }
  
export interface GroupSession {
    group_session_id: number;
    group_session_date: string;
    theme: string;
    trainer_id: number;
    trainer_name: string;
    workouts: string[];
    participants: string[];
  }
  