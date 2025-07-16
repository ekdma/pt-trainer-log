'use client'

import dayjs from 'dayjs';
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Member, WorkoutRecord, HealthMetric } from './types'
import AddMemberOpen from './AddMemberOpen'
import { SupabaseClient } from '@supabase/supabase-js'
import EditMemberModal from './EditMemberModal'
import { useRouter } from 'next/navigation'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { UsersIcon, Eye, EyeClosedIcon, X, UserRoundPen, UserRoundMinus, UserRoundPlus, UserRoundSearch, Calendar as CalendarIcon, PackageSearch, User } from 'lucide-react';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/solid'

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
  onSelectMember,
  onSetLogs,
  onSetHealthLogs,
}: {
  onSelectMember: (member: Member) => void
  onSetLogs: (logs: WorkoutRecord[]) => void
  onSetHealthLogs: (logs: HealthMetric[]) => void
}) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [keyword, setKeyword] = useState('')
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const router = useRouter()

  const [registrationCountMap, setRegistrationCountMap] = useState<{ [memberId: number]: number }>({});

  const [showSessionList, setShowSessionList] = useState(false);

  const [sessionProgress, setSessionProgress] = useState<{
    [memberId: number]: {
      pt: { used: number; total: number };
      group: { used: number; total: number };
    };
  }>({});

  const [sessionDates, setSessionDates] = useState<{
    [memberId: number]: {
      pt: string[];    // 예: ["2025-07-10", "2025-07-12"]
      group: string[];
    };
  }>({});
  
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  useEffect(() => {
    setSupabase(getSupabaseClient())
  }, [])

  const fetchMembers = async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('members').select('*')
    if (!error && data) {
      setFilteredMembers(data);
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
  
  const handleSearch = async () => {
    if (!supabase) return
    if (!keyword.trim()) {
      fetchMembers()
      return
    }
  
    const { data: membersData, error } = await supabase
      .from('members')
      .select('*')
      .ilike('name', `%${keyword}%`)
  
    if (error) {
      console.error('검색 에러:', error.message)
    } else {
      setFilteredMembers(membersData || [])
    }
  }

  const handleSelect = async (member: Member) => {
    if (!supabase) return

    // 운동 기록 가져오기
    const { data: logsData } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('member_id', member.member_id)

    onSetLogs(logsData || [])

    // 건강 지표 기록 가져오기
    const { data: healthData } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('member_id', member.member_id)

    onSetHealthLogs(healthData || [])

    // 회원 선택 콜백 호출
    onSelectMember(member)
  }

  const handleDelete = async (memberId: number) => {
    if (!supabase) return;
  
    const password = prompt('비밀번호를 입력하세요 🤐');
    if (password !== '2213') {
      alert('비밀번호가 일치하지 않습니다 ❌');
      return;
    }
  
    const confirmDelete = confirm('정말로 이 회원을 삭제하시겠습니까?');
    if (!confirmDelete) return;
  
    const { error } = await supabase.from('members').delete().eq('member_id', memberId);
    if (error) {
      alert('회원 삭제 중 문제가 발생했어요 😥');
      return;
    }
  
    alert('회원 삭제를 완료하였습니다 😊');
    fetchMembers();
  };

  // 재등록 횟수
  const fetchRegistrationCounts = async (members: Member[]) => {
    if (!supabase) return;
  
    const memberIds = members.map(m => m.member_id);
    const { data, error } = await supabase
      .from('member_packages')
      .select('member_id', { count: 'exact', head: false })
      .in('member_id', memberIds);
  
    if (error) {
      console.error('Registration count error:', error);
      return;
    }
  
    // supabase에서 직접 그룹별 카운트 반환이 안 되면 아래와 같이 직접 카운트하는 방식도 사용 가능:
    // const counts = data.reduce((acc, pkg) => {
    //   acc[pkg.member_id] = (acc[pkg.member_id] ?? 0) + 1;
    //   return acc;
    // }, {} as { [key: number]: number });
  
    // 여기서는 간단히 직접 count 조회 후 재구성
  
    // supabase에서 멤버별로 묶어 가져오는 것이 기본적으로 어려우므로,
    // 아래처럼 멤버별 패키지 전체 데이터 받고 직접 카운트할 수도 있습니다.
  
    const counts: { [key: number]: number } = {};
    data?.forEach((pkg) => {
      counts[pkg.member_id] = (counts[pkg.member_id] ?? 0) + 1;
    });
  
    setRegistrationCountMap(counts);
  };

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
      .select('member_id, pt_session_cnt, group_session_cnt, start_date, end_date, status')
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
      }
    } = {};

    const sessionDatesMap: {
      [id: number]: {
        pt: string[];
        group: string[];
      };
    } = {};
  
    members.forEach((member) => {
      const pkgs = packageData?.filter((pkg) => pkg.member_id === member.member_id) || [];
      const currentPackage = pkgs.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];
  
      const memberSessions = sessionData?.filter((s) => s.member_id === member.member_id) || [];
  
      const ptDates = Array.from(
        new Set(memberSessions.filter(s => s.session_type === 'PT').map(s => s.session_date))
      );
  
      const groupDates = Array.from(
        new Set(memberSessions.filter(s => s.session_type === 'GROUP').map(s => s.session_date))
      );
  
      progressMap[member.member_id] = {
        pt: {
          used: ptDates.length,
          total: currentPackage?.pt_session_cnt ?? 0,
        },
        group: {
          used: groupDates.length,
          total: currentPackage?.group_session_cnt ?? 0,
        }
      };
  
      sessionDatesMap[member.member_id] = {
        pt: ptDates,
        group: groupDates,
      };
    });

    setSessionProgress(progressMap);    // 사용량 + 총량
    setSessionDates(sessionDatesMap);  // 날짜 정보
  };
  
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    // // 1. 역할 우선순위: TRAINER 먼저
    // if (a.role !== b.role) {
    //   return a.role === 'TRAINER' ? -1 : 1
    // }
  
    // 2. 이름 가나다/알파벳 순 정렬 (localeCompare 사용)
    return a.name.localeCompare(b.name, 'ko')
  })

  return (
    <div className="flex flex-col items-center justify-center text-center bg-slate-50 py-8 px-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold text-indigo-600">회원 관리</h1>
        <p className="text-sm text-gray-500 mt-2">운동 기록을 확인하거나 새로운 회원을 등록해보세요</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center mb-6 space-y-2 sm:space-y-0 sm:space-x-3 w-full max-w-3xl">
        <div className="relative w-full sm:w-auto">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch()
            }}
            placeholder="이름을 입력하세요"
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder-gray-400"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>

        <button
          onClick={handleSearch}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-full shadow-md transition flex justify-center items-center gap-1 text-sm"
        >
          <UserRoundSearch size={20} /> 검색
        </button>
        <button
          onClick={() => setIsAddMemberOpen(true)}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-full shadow-md transition flex justify-center items-center gap-1 text-sm"
        >
          <UserRoundPlus size={20} /> 회원 추가
        </button>
        <button
          onClick={() => router.push('/packages')}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-full shadow-md transition flex justify-center items-center gap-1 text-sm"
        >
          <PackageSearch size={20} /> 패키지
        </button>
        <button
          onClick={() => router.push('/group-sessions')}
          className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-full shadow-md transition flex justify-center items-center gap-1 text-sm"
          >
          <UsersIcon size={20} /> 그룹세션
        </button>
      </div>

      <ul className="space-y-3 w-full max-w-md">
        {sortedMembers.map((member) => {
          const formattedJoinDate = dayjs(member.join_date).format('YY.MM.DD');
          // const formattedJoinDate = new Date(member.join_date).toLocaleDateString('ko-KR', {
          //   year: 'numeric',
          //   month: 'long',
          //   day: 'numeric',
          // })
          return (
            <li
              key={member.member_id}
              className="bg-white border border-indigo-200 rounded-xl px-5 py-3 shadow-sm hover:shadow-md transition duration-300 flex justify-between items-center"
            >
              {/* 왼쪽 정보 클릭 영역 */}
              <div
                onClick={() => handleSelect(member)}
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
                  <span className="text-indigo-800 font-semibold text-lg leading-tight">
                    {member.name}
                  </span>

                  {/* 첫 번째 줄: 성별 + 가입일 */}
                  <div className="flex gap-2 text-indigo-900 text-sm mt-1 flex-wrap items-center justify-center">
                    <span className="flex items-center gap-1 bg-gray-100 text-gray-900 px-2 py-1 rounded-full shadow-sm">
                      {member.sex}
                    </span>
                    <span className="flex items-center gap-1 bg-gray-100 text-gray-900 px-2 py-1 rounded-full shadow-sm">
                      <CalendarIcon size={13} />
                      {formattedJoinDate}
                    </span>
                  </div>

                  {/* 두 번째 줄: PT, GROUP 횟수 */}
                  <div className="flex gap-2 text-indigo-900 text-sm mt-1 flex-wrap items-center justify-center">
                    <span 
                      className="flex items-center gap-1 bg-blue-100 text-gray-900 px-2 py-1 rounded-full shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMemberId(member.member_id);
                      }}
                    >
                      <User size={13} />
                      {sessionProgress[member.member_id]?.pt.used ?? 0}/{sessionProgress[member.member_id]?.pt.total ?? 0}회
                    </span>
                    <span 
                      className="flex items-center gap-1 bg-purple-100 text-gray-900 px-2 py-1 rounded-full shadow-sm"
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
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => setEditingMember(member)}
                  className="text-indigo-500 hover:text-indigo-700 transition text-sm"
                  title="회원 정보 수정"
                >
                  <UserRoundPen size={18} />
                </button>
                <button
                  onClick={() => handleDelete(member.member_id)}
                  className="text-red-500 text-xs hover:text-red-700 transition text-sm"
                  title="회원 삭제"
                >
                  <UserRoundMinus size={18} />
                </button>
              </div>
            </li>

          )
        })}
      </ul>
      {editingMember && supabase && (
        <EditMemberModal
          member={editingMember}
          supabase={supabase}
          onClose={() => setEditingMember(null)}
          onUpdate={fetchMembers}
        />
      )}
      {isAddMemberOpen && (
        <AddMemberOpen
          onClose={() => setIsAddMemberOpen(false)}
          onMemberAdded={() => fetchMembers()}
        />
      )}

      {selectedMemberId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex justify-center items-center">
          <div className="bg-white rounded-xl p-6 shadow-lg max-w-md w-full relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-black transition"
              onClick={() => setSelectedMemberId(null)}
            >
              <X size={20} />
            </button>

            <div className="flex justify-center items-center mb-4 space-x-4">
              <h3 className="text-lg font-semibold text-indigo-700">
                {sortedMembers.find(m => m.member_id === selectedMemberId)?.name}님의 세션 일정
              </h3>

              <button
                onClick={() => setShowSessionList(prev => !prev)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-full hover:bg-indigo-100 transition"
              >
                {showSessionList ? (
                  <>
                    <EyeClosedIcon className="w-4 h-4" />
                    세션 닫기
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    세션 보기
                  </>
                )}
              </button>

            </div>


            <Calendar
              className="mx-auto"
              prev2Label={
                <ChevronDoubleLeftIcon className="w-4 h-4 text-gray-500 hover:text-blue-500 transition" />
              }
              prevLabel={
                <ChevronLeftIcon className="w-4 h-4 text-gray-600 hover:text-blue-500 transition" />
              }
              nextLabel={
                <ChevronRightIcon className="w-4 h-4 text-gray-600 hover:text-blue-500 transition" />
              }
              next2Label={
                <ChevronDoubleRightIcon className="w-4 h-4 text-gray-500 hover:text-blue-500 transition" />
              }
              tileClassName={({ date }) => {
                const d = dayjs(date).format('YYYY-MM-DD');
                const memberSessions = sessionDates[selectedMemberId!];
                if (!memberSessions) return '';

                if (memberSessions.pt.includes(d)) return 'pt-session';
                if (memberSessions.group.includes(d)) return 'group-session';

                return '';
              }}
            />

            {/* 세션 리스트 */}
            {/* {showSessionList && (
              <div className="mt-4 space-y-2 text-sm">
                <h4 className="text-gray-700 font-semibold mb-2">PT 세션</h4>
                {sessionDates[selectedMemberId!]?.pt.map(date => (
                  <div key={`pt-${date}`} className="text-blue-600">
                    🏋️ {date}
                  </div>
                ))}

                <h4 className="text-gray-700 font-semibold mt-4 mb-2">GROUP 세션</h4>
                {sessionDates[selectedMemberId!]?.group.map(date => (
                  <div key={`group-${date}`} className="text-green-600">
                    👥 {date}
                  </div>
                ))}
              </div>
            )} */}
            {showSessionList && (
              <div className="mt-4 space-y-3 text-sm flex flex-col items-center">
                {/* PT 세션 날짜 정렬 */}
                {sessionDates[selectedMemberId!]?.pt
                  .slice()
                  .sort((a, b) => dayjs(a).unix() - dayjs(b).unix())
                  .map(date => (
                    <div key={`pt-${date}`} className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">
                        PT
                      </span>
                      <span className="text-gray-800">
                        {dayjs(date).format('YYYY.MM.DD')} ({'일월화수목금토'[dayjs(date).day()]})
                      </span>
                    </div>
                  ))}

                {/* 그룹 세션 날짜 정렬 */}
                {sessionDates[selectedMemberId!]?.group
                  .slice()
                  .sort((a, b) => dayjs(a).unix() - dayjs(b).unix())
                  .map(date => (
                    <div key={`group-${date}`} className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full">
                        GROUP
                      </span>
                      <span className="text-gray-800">
                        {dayjs(date).format('YYYY.MM.DD')} ({'일월화수목금토'[dayjs(date).day()]})
                      </span>
                    </div>
                  ))}
              </div>
            )}


          </div>
        </div>
      )}

    </div>
  )
}
