import { supabase } from "@/lib/supabase"; // 네 supabase 클라이언트 경로에 맞게 수정

import type { Member, WorkoutRecord } from "../app/members/types"; 
// 타입 경로도 네 프로젝트에 맞게 조정 필요

interface PostgrestError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

// 회원 목록 조회
export async function getMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch members:", error);
    return [];
  }
  return data as Member[];
}

// 특정 회원의 운동 기록 조회
export async function getWorkoutRecords(member_id: number): Promise<WorkoutRecord[]> {
    const { data, error } = await supabase
      .from("workout_records")
      .select("*")
      .eq("member_id", member_id)
      .order("workout_date", { ascending: true });
  
    if (error) {
      console.error("Failed to fetch workout records:", error);
      return [];
    }
    return data || [];
  }
  

// 운동 기록 추가
export async function addWorkoutRecord(newRecord: WorkoutRecord): Promise<{ data: WorkoutRecord | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("workout_records")
    .insert([newRecord])
    .select()
    .single();

  if (error) {
    console.error("Failed to add workout record:", error);
    return { data: null, error };
  }

  return { data: data as WorkoutRecord, error: null };
}

// 회원별 타겟 정보 조회 (MemberGraphs 컴포넌트에서 사용한다고 가정)
export async function getTargetsByMemberId(member_id: number): Promise<Member[]> {
  const { data, error } = await supabase
    .from("targets")
    .select("*")
    .eq("member_id", member_id);

  if (error) {
    console.error("Failed to fetch targets:", error);
    return [];
  }
  return data as Member[] || [];
}