'use client'

import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
dayjs.extend(isBetween)
import { useState, useEffect, useMemo } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Member } from './types'
import MemberCalendar from './MemberCalendar'
import { SupabaseClient } from '@supabase/supabase-js'
import 'react-calendar/dist/Calendar.css'
import {  Dumbbell, UsersIcon, UserRoundPen, UserRoundMinus, Calendar as CalendarIcon, User } from 'lucide-react';
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import ConfirmDeleteItem from '@/components/ui/ConfirmDeleteItem' 
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Utensils } from 'lucide-react'
import MealToggle from './MealToggle'

function toOrdinal(num: number) {
  const v = num % 100;
  if (v >= 11 && v <= 13) {
    return num + "th";
  }
  switch (num % 10) {
    case 1:
      return num + "st";
    case 2:
      return num + "nd";
    case 3:
      return num + "rd";
    default:
      return num + "th";
  }
}

export default function MemberSearch({
  // onSelectMember,
  // onSetLogs,
  // onSetHealthLogs,
  setEditingMember,
  members,
  onRefresh,
}: {
  onSelectMember: (member: Member) => void
  // onSetLogs: (logs: WorkoutRecord[]) => void
  // onSetHealthLogs: (logs: HealthMetric[]) => void
  setEditingMember: (member: Member) => void
  members: Member[] 
  onRefresh: () => void
}) {
  // const router = useRouter()  
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  // const filteredMembers = useMemo(() => members, [members]);
  const [registrationCountMap, setRegistrationCountMap] = useState<{ [memberId: number]: number }>({});

  const [showSessionList, setShowSessionList] = useState(false);

  const [sessionProgress, setSessionProgress] = useState<{
    [memberId: number]: {
      pt: { used: number; total: number };
      group: { used: number; total: number };
      self: { used: number; total: number };
    };
  }>({});

  const [sessionDates, setSessionDates] = useState<{
    [memberId: number]: {
      pt: string[];    // 예: ["2025-07-10", "2025-07-12"]
      group: string[];
      self: string[];
    };
  }>({});
  
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  useEffect(() => {
    setSupabase(getSupabaseClient())
  }, [])

  const [internalMembers, setInternalMembers] = useState<Member[]>(members);

  useEffect(() => {
    setInternalMembers(members); // 외부 props가 바뀔 때 반영
  }, [members]);
  

  const fetchMembers = async () => {
    if (!supabase) return
    // const { data, error } = await supabase.from('members').select('*')
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .not('status', 'eq', 'delete');

      if (!error && data) {
      setInternalMembers(data);
      fetchSessionProgress(data); 
      // fetchRegistrationCounts(data); 
      fetchMemberPackageData(data); 
    }
  }

  useEffect(() => {
    if (supabase) {
      fetchMembers()
    }
  }, [supabase])
  
  // const handleSelect = async (member: Member) => {
  //   if (!supabase) return;
  
  //   // 1. 운동 기록 가져오기
  //   const { data: logsData } = await supabase
  //     .from('workout_logs')
  //     .select('*')
  //     .eq('member_id', member.member_id);
  //   onSetLogs(logsData || []);
  
  //   // 2. 건강 기록 가져오기
  //   const { data: healthData } = await supabase
  //     .from('health_metrics')
  //     .select('*')
  //     .eq('member_id', member.member_id);
  //   onSetHealthLogs(healthData || []);
  
  //   // 3. 회원 선택 정보 저장 (localStorage 사용)
  //   localStorage.setItem('litpt_member', JSON.stringify(member));
  
  //   // 4. workout 페이지로 이동
  //   router.push('/workout');
  // };

  const handleDelete = (memberId: number) => {
    const member = internalMembers.find((m) => m.member_id === memberId)
    const memberName = member?.name ?? '이름 없는'
    const toastId = crypto.randomUUID()
  
    toast.custom(
      (id) => (
        <ConfirmDeleteItem
          title={
            <>
              정말로 <strong className="text-red-600">{memberName}</strong> 회원을 삭제하시겠습니까?
            </>
          }
          description="삭제된 회원은 복구할 수 없습니다."
          onCancel={() => toast.dismiss(id)}
          onConfirm={async () => {
            toast.dismiss(id)
            const password = prompt('비밀번호를 입력하세요 🤐')
            if (password !== '2213') {
              toast.error('비밀번호가 일치하지 않습니다 ❌')
              return
            }
  
            if (!supabase) {
              toast.error('Supabase가 초기화되지 않았습니다 ❌')
              return
            }

            const { error } = await supabase
              .from('members')
              .update({ status: 'delete' })
              .eq('member_id', memberId)

            if (error) {
              toast.error('회원 삭제 중 문제가 발생했어요 😥')
              return
            }

            toast.success(`"${memberName}" 회원이 삭제되었습니다.`)
            fetchMembers()
          }}
        />
      ),
      { id: toastId }
    )
  }

  // 재등록 횟수
  // const fetchRegistrationCounts = async (members: Member[]) => {
  //   if (!supabase) return;
  
  //   const memberIds = members.map(m => m.member_id);
  //   const { data, error } = await supabase
  //     .from('member_packages')
  //     .select('member_id', { count: 'exact', head: false })
  //     .in('member_id', memberIds);
  
  //   if (error) {
  //     console.error('Registration count error:', error);
  //     return;
  //   }
  
  //   // supabase에서 직접 그룹별 카운트 반환이 안 되면 아래와 같이 직접 카운트하는 방식도 사용 가능:
  //   // const counts = data.reduce((acc, pkg) => {
  //   //   acc[pkg.member_id] = (acc[pkg.member_id] ?? 0) + 1;
  //   //   return acc;
  //   // }, {} as { [key: number]: number });
  
  //   // 여기서는 간단히 직접 count 조회 후 재구성
  
  //   // supabase에서 멤버별로 묶어 가져오는 것이 기본적으로 어려우므로,
  //   // 아래처럼 멤버별 패키지 전체 데이터 받고 직접 카운트할 수도 있습니다.
  
  //   const counts: { [key: number]: number } = {};
  //   data?.forEach((pkg) => {
  //     counts[pkg.member_id] = (counts[pkg.member_id] ?? 0) + 1;
  //   });
  
  //   setRegistrationCountMap(counts);
  // };

  // valid_date 합
  type Package = { valid_date: number | null }

  const fetchMemberPackageData = async (members: Member[]) => {
    if (!supabase) return;

    const memberIds = members.map(m => m.member_id);

    const { data, error } = await supabase
      .from('member_packages')
      .select('member_id, packages!member_packages_package_id_fkey(valid_date)')
      .in('member_id', memberIds);

    if (error) {
      console.error('Supabase error:', error);
      return;
    }

    const validDateMap: { [key: number]: number } = {};

    data.forEach((pkg) => {
      const memberId = pkg.member_id;
      const packages = pkg.packages as unknown;

      let totalValid = 0;

      if (Array.isArray(packages)) {
        totalValid = packages.reduce((sum, p) => sum + (p.valid_date ?? 0), 0);
      } else if (packages && typeof packages === 'object' && 'valid_date' in packages) {
        totalValid = (packages as Package).valid_date ?? 0;
      }

      validDateMap[memberId] = (validDateMap[memberId] ?? 0) + totalValid;
    });

    setRegistrationCountMap(validDateMap);
  };
  
  const fetchSessionProgress = async (members: Member[]) => {
    if (!supabase) return;
  
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const memberIds = members.map((m) => m.member_id);

    // 1. 오늘 기준 진행 중인(active) 패키지에서 pt_session_cnt 가져오기
    const { data: packageData } = await supabase
      .from('member_packages')
      .select('member_id, pt_session_cnt, group_session_cnt, self_session_cnt, start_date, end_date, status')
      .in('member_id', memberIds)
      .eq('status', 'active')
      .lte('start_date', today)
      .gte('end_date', today);
  
    // 2. 각 회원의 PT 세션 진행 횟수 가져오기
    const { data: sessionData } = await supabase
      .from('pt_sessions')
      .select('member_id, session_date, session_type')
      // .eq('session_type', 'PT')
      .in('member_id', memberIds);
  
    const progressMap: {
      [id: number]: {
        pt: { used: number; total: number },
        group: { used: number; total: number },
        self: { used: number; total: number },
      }
    } = {};

    const sessionDatesMap: {
      [id: number]: {
        pt: string[];
        group: string[];
        self: string[];
      };
    } = {};
  
    members.forEach((member) => {
      const pkgs = packageData?.filter((pkg) => pkg.member_id === member.member_id) || [];
      const currentPackage = pkgs.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];
  
      const memberSessions = sessionData?.filter((s) => s.member_id === member.member_id) || [];
  
      const ptDates = Array.from(
        new Set(
          memberSessions
            .filter(
              (s) =>
                s.session_type === 'PT' &&
                currentPackage &&
                dayjs(s.session_date).isBetween(currentPackage.start_date, currentPackage.end_date, 'day', '[]')
            )
            .map((s) => s.session_date)
        )
      );
      
      const groupDates = Array.from(
        new Set(
          memberSessions
            .filter(
              (s) =>
                s.session_type === 'GROUP' &&
                currentPackage &&
                dayjs(s.session_date).isBetween(currentPackage.start_date, currentPackage.end_date, 'day', '[]')
            )
            .map((s) => s.session_date)
        )
      );

      const selfDates = Array.from(
        new Set(
          memberSessions
            .filter(
              (s) =>
                s.session_type === 'SELF' &&
                currentPackage &&
                dayjs(s.session_date).isBetween(currentPackage.start_date, currentPackage.end_date, 'day', '[]')
            )
            .map((s) => s.session_date)
        )
      );
  
      progressMap[member.member_id] = {
        pt: {
          used: ptDates.length,
          total: currentPackage?.pt_session_cnt ?? 0,
        },
        group: {
          used: groupDates.length,
          total: currentPackage?.group_session_cnt ?? 0,
        },
        self: {
          used: selfDates.length,
          total: currentPackage?.self_session_cnt ?? 0,
        }
      };
  
      sessionDatesMap[member.member_id] = {
        pt: ptDates,
        group: groupDates,
        self: selfDates,
      };
    });

    setSessionProgress(progressMap);    // 사용량 + 총량
    setSessionDates(sessionDatesMap);  // 날짜 정보
  };
  
  const filteredMembers = useMemo(() => internalMembers, [internalMembers]);
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    // // 1. 역할 우선순위: TRAINER 먼저
    // if (a.role !== b.role) {
    //   return a.role === 'TRAINER' ? -1 : 1
    // }
  
    // 2. 이름 가나다/알파벳 순 정렬 (localeCompare 사용)
    return a.name.localeCompare(b.name, 'ko')
  })

  // ✅ 회원 상태 토글 핸들러
  // const handleToggleStatus = async (member: Member) => {
  //   if (!supabase) return

  //   const newStatus = member.status === 'active' ? 'inactive' : 'active'

  //   const { error } = await supabase
  //     .from('members')
  //     .update({ status: newStatus })
  //     .eq('member_id', member.member_id)

  //   if (error) {
  //     toast.error('상태 변경에 실패했어요.')
  //   } else {
  //     toast.success(`회원 상태를 ${newStatus === 'active' ? '활성화' : '비활성화'}했어요.`)
  //     fetchMembers() // 상태 갱신
  //   }
  // }

  return (
    <div className="flex flex-col items-center justify-center text-center bg-slate-50 py-8 px-4">
      <ul className="space-y-4 w-full max-w-3xl mx-auto">
        {sortedMembers.map((member) => {
          const formattedJoinDate = dayjs(member.join_date).format('YY.MM.DD');
          return (
            <li
              key={member.member_id}
              className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm hover:shadow-md transition duration-300 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              {/* 왼쪽 정보 클릭 영역 */}
              <div
                // onClick={() => handleSelect(member)}
                className="flex cursor-pointer hover:bg-indigo-50 rounded-md px-3 py-2 transition flex-1 items-center gap-6"
              >
                <div className="flex flex-col flex-shrink-0 items-center">
                  {/* 역할 뱃지 */}
                  <span
                    className={`text-xs font-bold text-white rounded-full px-2 py-0.5 ${
                      member.level === 'Level 1'
                        ? 'bg-yellow-500'
                        : member.level === 'Level 2'
                        ? 'bg-green-500'
                        : member.level === 'Level 3'
                        ? 'bg-blue-500'
                        : member.level === 'Level 4'
                        ? 'bg-red-500'
                        : member.level === 'Level 5'
                        ? 'bg-black'
                        : 'bg-gray-400'
                    }`}
                  >
                    {member.level}
                  </span>
                
                  {/* 재등록 횟수 뱃지 */}
                  {registrationCountMap[member.member_id] && (
                    <span className="text-xs font-semibold text-white bg-orange-400 rounded-full px-2 py-0.5 mt-1">
                      {toOrdinal(registrationCountMap[member.member_id])}
                    </span>
                  )}
                </div>

                {/* 이름 + 정보 */}
                <div className="flex flex-col items-center flex-grow">
                  {/* <div className="flex items-center justify-center mb-1">
                    <ToggleGroup
                      type="single"
                      value={member.status}
                      onValueChange={async (value) => {
                        if (!value) return
                        if (!supabase) return

                        const { error } = await supabase
                          .from('members')
                          .update({ status: value })
                          .eq('member_id', member.member_id)

                        if (error) {
                          toast.error('상태 변경 실패')
                        } else {
                          toast.success(`회원 상태가 ${value === 'active' ? 'Active' : 'Inactive'}로 변경되었습니다`)
                          fetchMembers() // 변경 후 목록 새로고침
                        }
                      }}
                    >
                      <ToggleGroupItem value="active">Active</ToggleGroupItem>
                      <ToggleGroupItem value="inactive">Inactive</ToggleGroupItem>
                    </ToggleGroup>

                  </div> */}

                  <span className="text-gray-800 font-semibold text-lg leading-tight">
                    {member.name}{member.nickname ? ` | ${member.nickname}` : ''}
                  </span>

                  {/* 첫 번째 줄: 성별 + 가입일 */}
                  <div className="flex gap-2 text-indigo-900 text-sm mt-1 flex-wrap items-center justify-center">
                    <span className="text-xs flex items-center gap-1 bg-gray-100 text-gray-900 px-2 py-1 rounded-full shadow-sm">
                      {member.sex}
                    </span>
                    <span className="text-xs flex items-center gap-1 bg-gray-100 text-gray-900 px-2 py-1 rounded-full shadow-sm">
                      <CalendarIcon size={13} />
                      {formattedJoinDate}
                    </span>
                  </div>

                  {/* 두 번째 줄: PT, GROUP 횟수 */}
                  <div className="flex gap-2 text-indigo-900 text-sm mt-1 flex-wrap items-center justify-center">
                    <span 
                      className="text-xs flex items-center gap-1 bg-blue-100 text-gray-900 px-2 py-1 rounded-full shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMemberId(member.member_id);
                      }}
                    >
                      <Dumbbell size={13} />
                      {sessionProgress[member.member_id]?.pt.used ?? 0}/{sessionProgress[member.member_id]?.pt.total ?? 0}회
                    </span>
                    <span 
                      className="text-xs flex items-center gap-1 bg-[#d1fae5] text-gray-900 px-2 py-1 rounded-full shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMemberId(member.member_id);
                      }}
                    >
                      <User size={13} />
                      {sessionProgress[member.member_id]?.self.used ?? 0}/{sessionProgress[member.member_id]?.self.total ?? 0}회
                    </span>
                    <span 
                      className="text-xs flex items-center gap-1 bg-purple-100 text-gray-900 px-2 py-1 rounded-full shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMemberId(member.member_id);
                      }}
                    >
                      <UsersIcon size={13} />
                      {sessionProgress[member.member_id]?.group.used ?? 0}/{sessionProgress[member.member_id]?.group.total ?? 0}회
                    </span>
                  </div>
                </div>

              </div>

              {/* 오른쪽 버튼 영역 */}
              <div className="flex flex-col items-end gap-2 justify-between">
                <ToggleGroup
                  type="single"
                  value={member.status}
                  onValueChange={async (value) => {
                    if (!value || !supabase) return
                    const { error } = await supabase
                      .from('members')
                      .update({ status: value })
                      .eq('member_id', member.member_id)

                    if (error) {
                      toast.error('상태 변경 실패')
                    } else {
                      toast.success(`회원 상태가 ${value === 'active' ? 'Active' : 'Inactive'}로 변경되었습니다`)
                      onRefresh?.() // ✅ 부모에서 필터된 회원 목록만 다시 불러옴
                    }
                  }}
                >
                  <ToggleGroupItem value="active">Active</ToggleGroupItem>
                  <ToggleGroupItem value="inactive">Inactive</ToggleGroupItem>
                </ToggleGroup>

                {/* 식단 관리 토글 */}
                <MealToggle
                  memberId={member.member_id}
                  mealEnabled={member.meal_enabled}
                  onRefresh={onRefresh}
                />
                {/* <ToggleGroup
                  type="single"
                  value={member.meal_enabled ? 'on' : 'off'}
                  onValueChange={async (value) => {
                    if (!value || !supabase) return

                    const enabled = value === 'on'

                    const { error } = await supabase
                      .from('members')
                      .update({ meal_enabled: enabled })
                      .eq('member_id', member.member_id)

                    if (error) {
                      console.error('meal_enabled update error:', error)
                      toast.error(error.message)   // 👈 진짜 원인 출력
                    }
                    else {
                      toast.success(
                        `식단 관리가 ${enabled ? '활성화' : '비활성화'}되었습니다`
                      )
                      onRefresh?.()
                    }
                  }}
                  className="mt-1"
                >
                  <ToggleGroupItem value="on" className="flex gap-1">
                    <Utensils size={14} />
                    ON
                  </ToggleGroupItem>
                  <ToggleGroupItem value="off">OFF</ToggleGroupItem>
                </ToggleGroup> */}

                
                <div className="flex gap-2">
                  <Button
                    onClick={() => setEditingMember(member)}
                    variant="ghost"
                    className="font-semibold bg-white border border-transparent text-indigo-700 hover:bg-indigo-300 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
                    title="회원 수정"
                  >
                    <UserRoundPen size={16} />
                    수정
                  </Button>
                  <Button
                    onClick={() => handleDelete(member.member_id)}
                    variant="ghost"
                    className="font-semibold bg-white border border-transparent text-red-600 hover:bg-red-100 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
                    title="회원 삭제"
                  >
                    <UserRoundMinus size={16} />
                    삭제
                  </Button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {selectedMemberId && (
        <MemberCalendar
          member={sortedMembers.find((m) => m.member_id === selectedMemberId)!}
          sessionDates={sessionDates}
          showSessionList={showSessionList}
          setShowSessionList={setShowSessionList}
          onClose={() => setSelectedMemberId(null)}
        />
      )}

    </div>
  )
}
