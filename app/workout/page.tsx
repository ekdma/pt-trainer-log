'use client'

import { useState, useEffect } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import Header from '@/components/layout/Header'
import TrainerHeader from '@/components/layout/TrainerHeader'
import MemberGraphs from '@/components/workout/MemberGraphs'
import WorkoutLogManager from '@/components/workout/WorkoutLogManager'
import type { Member, WorkoutRecord } from '@/components/members/types'
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

  // 트레이너: 회원 목록 조회
  const fetchAllMembers = async () => {
    const { data, error } = await supabase.from('members').select('*')
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
      .select('target, workout')
      .eq('member_id', selectedMember?.member_id)

    if (!error && data) {
      const favSet = new Set(data.map(fav => `${fav.target}||${fav.workout}`))
      setFavorites(favSet)
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
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-lg font-semibold text-gray-800">운동기록 관리</h2>
              <div
                className={`ml-2 px-3 py-1 rounded-md text-white font-semibold shadow-sm text-xs ${
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
              />
            )}
            {activeTab === 'records' && (
              <WorkoutLogManager
                member={selectedMember}
                logs={workoutLogs}
                onUpdateLogs={setWorkoutLogs}
                showFavoritesOnly={showFavoritesOnly}
                favorites={favorites}
                setFavorites={setFavorites}
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
