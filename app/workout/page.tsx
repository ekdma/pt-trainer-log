'use client'

import { useState, useEffect } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import Header from '@/components/layout/Header'
import TrainerHeader from '@/components/layout/TrainerHeader'
import MemberGraphs from '@/components/workout/MemberGraphs'
import WorkoutLogManager from '@/components/workout/WorkoutLogManager'
import OrderFavoriteWorkout from '@/components/workout/OrderFavoriteWorkout'
import OrderManagementModal from '@/components/workout/OrderManagementModal'
import type { Member, WorkoutRecord, WorkoutType } from '@/components/members/types'
import { fetchWorkoutLogs } from '@/utils/fetchLogs'
import { getSupabaseClient } from '@/lib/supabase'
import { FaStar, FaRegStar } from 'react-icons/fa'
import { Button } from '@/components/ui/button'

export default function MembersPage() {
  useAuthGuard()
  const supabase = getSupabaseClient()

  const [userRole, setUserRole] = useState<'member' | 'trainer' | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const [workoutLogs, setWorkoutLogs] = useState<WorkoutRecord[]>([])
  const [activeTab, setActiveTab] = useState<'records' | 'graphs'>('records')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [description, setDescription] = useState<string>('')
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [favoritesWithOrder, setFavoritesWithOrder] = useState<{ key: string, order: number }[]>([])
  const [showGlobalOrderModal, setShowGlobalOrderModal] = useState(false); // 전체 운동용
  const [allTypes, setAllTypes] = useState<WorkoutType[]>([]);

  // 사용자 정보 초기화
  useEffect(() => {
    const raw = localStorage.getItem('litpt_member')
    const user = raw ? JSON.parse(raw) : null
    if (user) {
      setUserRole(user.role)
      if (user.role === 'member') {
        setSelectedMember(user)
      } else {
        fetchAllMembers()
      }
    }
  }, [])

  useEffect(() => {
    if (selectedMember) {
      setDescription(selectedMember.description || '')
    } else {
      setDescription('')
    }
  }, [selectedMember])

  // 트레이너: 회원 목록 조회
  const fetchAllMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active')
    if (!error && data) setMembers(data)
  }

  useEffect(() => {
    const fetchLogs = async () => {
      if (!selectedMember) return
      const logs = await fetchWorkoutLogs(selectedMember.member_id)
      setWorkoutLogs(logs)
    }
    if (activeTab === 'graphs') fetchLogs()
  }, [activeTab, selectedMember])

  // ✅ 즐겨찾기 및 보기 상태 관련 useEffect
  useEffect(() => {
    if (!selectedMember) return
    fetchLastViewMode()
    fetchFavorites()
  }, [selectedMember?.member_id])

  const fetchLastViewMode = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('last_view_mode')
      .eq('member_id', selectedMember?.member_id)
      .single()

    if (!error && data) {
      setShowFavoritesOnly(data.last_view_mode === 'favorites')
    }
  }

  const fetchFavorites = async () => {
    const { data, error } = await supabase
      .from('favorites')
      .select('target, workout, order')
      .eq('member_id', selectedMember?.member_id)
  
    if (!error && data) {
      const favSet = new Set(data.map(fav => `${fav.target}||${fav.workout}`))
      setFavorites(favSet)
  
      // ✅ 정렬 가능한 정보 저장
      const ordered = data.map(fav => ({
        key: `${fav.target}||${fav.workout}`,
        order: fav.order ?? 0,
      }))
      setFavoritesWithOrder(ordered)
    }
  }
  

  const toggleViewMode = async () => {
    const newMode = !showFavoritesOnly
    setShowFavoritesOnly(newMode)

    await supabase
      .from('members')
      .update({ last_view_mode: newMode ? 'favorites' : 'all' })
      .eq('member_id', selectedMember?.member_id)
  }

  const saveDescription = async () => {
    if (!selectedMember) return
    const { error } = await supabase
      .from('members')
      .update({ description })
      .eq('member_id', selectedMember.member_id)
    if (error) {
      alert('설명 저장 중 오류가 발생했습니다.')
      console.error(error)
    } else {
      alert('설명이 저장되었습니다.')
      // 선택 회원 상태 업데이트
      setSelectedMember({ ...selectedMember, description })
    }
  }

  const fetchAllTypes = async () => {
    const { data, error } = await supabase
      .from('workout_types')
      .select('workout_type_id, target, workout, order_target, order_workout, level')
      // order_target 기준으로 정렬하고, 그 다음 order_workout 기준 정렬 (필요시)
      .order('order_target', { ascending: true })
      .order('order_workout', { ascending: true })
  
    if (!error && data) {
      setAllTypes(data as WorkoutType[])  // 타입 명시
    } else {
      console.error('전체 운동 항목 불러오기 실패:', error)
    }
  }

  useEffect(() => {
    if (!showFavoritesOnly) {
      fetchAllTypes()
    }
  }, [showFavoritesOnly])
  

  return (
    <div className="min-h-screen bg-gray-50">
      {userRole === 'trainer' ? <TrainerHeader /> : <Header />}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {userRole === 'trainer' && (
          <div className="mb-6">
            <select
              value={selectedMember?.member_id || ''}
              onChange={(e) => {
                const selectedId = e.target.value
                const m = members.find(m => String(m.member_id) === selectedId)
                setSelectedMember(m || null)
                setFavorites(new Set())
              }}
              className="block w-full max-w-md px-4 py-2 text-base border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition duration-200 hover:border-rose-400 cursor-pointer"
            >
              <option value="">회원 선택</option>
              {members
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                .map((m) => (
                  <option key={m.member_id} value={m.member_id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>
        )}
        
        {selectedMember ? (
          <>
            {/* ✅ 공통 상단: 타이틀, 레벨, 즐겨찾기 버튼 */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
              {/* 1. 운동기록관리 */}
              <h2 className="text-lg font-semibold text-gray-800 whitespace-nowrap">
                운동기록 관리
              </h2>

              {/* 2. level + 즐겨찾기 버튼 */}
              <div className="flex items-center gap-3 whitespace-nowrap">
                <div
                  className={`px-3 py-1 rounded-md text-white font-semibold shadow-sm text-xs ${
                    selectedMember.level === 'Level 1'
                      ? 'bg-yellow-500'
                      : selectedMember.level === 'Level 2'
                      ? 'bg-green-500'
                      : selectedMember.level === 'Level 3'
                      ? 'bg-blue-500'
                      : selectedMember.level === 'Level 4'
                      ? 'bg-red-500'
                      : selectedMember.level === 'Level 5'
                      ? 'bg-black'
                      : 'bg-gray-400'
                  }`}
                >
                  {selectedMember.level}
                </div>

                <button
                  onClick={toggleViewMode}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition
                    ${showFavoritesOnly ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                >
                  {showFavoritesOnly ? (
                    <>
                      <FaStar className="text-yellow-300" />
                      즐겨찾기
                    </>
                  ) : (
                    <>
                      <FaRegStar className="text-gray-500" />
                      전체운동
                    </>
                  )}
                </button>
                
                {userRole === 'trainer' && (       
                  <button
                    onClick={() => {
                      if (showFavoritesOnly) {
                        setShowOrderModal(true);  // 👉 OrderWorkout 모달
                      } else {
                        setShowGlobalOrderModal(true); // 👉 OrderManagementModal 모달
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition 
                      ${showFavoritesOnly ? 'bg-yellow-200 text-white hover:bg-yellow-400' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                  >
                    순서
                  </button>
                )}

                {showOrderModal && selectedMember && (
                  <OrderFavoriteWorkout
                    memberId={selectedMember.member_id}
                    onClose={async () => {
                      setShowOrderModal(false)
                      await fetchFavorites() // ✅ 순서 저장 후 다시 즐겨찾기 불러오기
                    }}
                  />
                )}

                {showGlobalOrderModal && (
                  <OrderManagementModal
                    isOpen={showGlobalOrderModal}
                    onClose={() => setShowGlobalOrderModal(false)}
                    allTypes={allTypes} // 이건 props로 받아야 함
                    onRefreshAllTypes={fetchAllTypes} // 순서 저장 후 다시 불러오기
                  />
                )}
              </div>

              {userRole === 'trainer' && (        
                <>
                  {/* 3. 회원 설명 + 저장 + textarea */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <label
                        htmlFor="description"
                        className="text-gray-700 font-semibold flex-shrink-0 whitespace-nowrap"
                      >
                        회원 설명
                      </label>
                      <Button
                        onClick={saveDescription}
                        variant="darkGray"
                        size="sm"
                        className="text-sm shrink-0"
                      >
                        저장
                      </Button>
                    </div>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none min-w-0"
                      placeholder="예: 디스크 있음, 병원 다녀옴 등 회원 상태를 기록하세요."
                    />
                  </div>
                </>
              )}  
            </div>



            {/* 탭 메뉴 */}
            <div className="flex gap-3 mb-6">
              <Button
                variant={activeTab === 'records' ? 'menu_click' : 'menu_unclick'}
                size="sm"
                onClick={() => setActiveTab('records')}
              >
                기록지
              </Button>

              <Button
                variant={activeTab === 'graphs' ? 'menu_click' : 'menu_unclick'}
                size="sm"
                onClick={() => setActiveTab('graphs')}
              >
                그래프
              </Button>
            </div>

            {/* 본문 */}
            {activeTab === 'graphs' && (
              <MemberGraphs
                member={selectedMember}
                record={workoutLogs}
                logs={workoutLogs}
                onBack={() => {}}
                showFavoritesOnly={showFavoritesOnly}  
                favorites={favorites}  
                favoritesWithOrder={favoritesWithOrder}           
                allTypes={allTypes}    
              />
            )}
            {activeTab === 'records' && (
              <WorkoutLogManager
                member={selectedMember}
                logs={workoutLogs}
                onUpdateLogs={setWorkoutLogs}
                showFavoritesOnly={showFavoritesOnly}
                favorites={favorites}
                favoritesWithOrder={favoritesWithOrder}
                setFavorites={setFavorites}
                onFavoritesChange={fetchFavorites}
                allTypes={allTypes}
                onRefreshAllTypes={fetchAllTypes}
              />
            )}
          </>
        ) : (
          <div className="text-gray-600">회원을 선택하세요.</div>
        )}
      </main>
    </div>
  )
}
