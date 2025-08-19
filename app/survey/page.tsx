'use client'

import { useState, useEffect } from 'react'
import TrainerHeader from '@/components/layout/TrainerHeader'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { getSupabaseClient } from '@/lib/supabase'
import { Search, FilePlus2, CirclePlay } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AddSurvey from '@/components/survey/AddSurvey'
import EditSurvey from '@/components/survey/EditSurvey'
import SurveyDetail from '@/components/survey/SurveyDetail'
import SurveySearch from '@/components/survey/SurveySearch'
import SurveyResponseMulti from '@/components/survey/SurveyResponseMuilti'
import { toast } from 'sonner'
import ConfirmDeleteItem from '@/components/ui/ConfirmDeleteItem'
import { useAuth } from '@/context/AuthContext'

interface Survey {
  id: string
  title: string
  description?: string
  created_at: string
}

export default function SurveysPage() {
  const [keyword, setKeyword] = useState('')
  const [filteredSurveys, setFilteredSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const supabase = getSupabaseClient()
  const [isAddSurveyOpen, setIsAddSurveyOpen] = useState(false)
  const [myMemberId, setMyMemberId] = useState<number | null>(null)
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)
  const [isStartSurveyOpen, setIsStartSurveyOpen] = useState(false)

  const { user } = useAuth() // AuthContext에서 user 가져오기

  const handleSurveyClick = (id: string) => setSelectedSurveyId(id)
  const handleBackToList = () => setSelectedSurveyId(null)

  // const handleSurveyAdded = () => {
  //   fetchSurveys() // 설문 목록 다시 불러오는 함수
  // }

  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null)

  // 수정 클릭
  const handleEditSurvey = (survey: Survey) => {
    setEditingSurvey(survey)
  }

  // 삭제 클릭
  const handleDeleteSurvey = (survey: Survey) => {
    const toastId = crypto.randomUUID()
  
    toast.custom(
      (id) => (
        <ConfirmDeleteItem
          title={
            <>
              정말로 <strong className="text-red-600">{survey.title}</strong> 설문을 정말 삭제하시겠습니까?
            </>
          }
          description="삭제된 설문은 복구할 수 없습니다."
          onCancel={() => toast.dismiss(id)}
          onConfirm={async () => {
            toast.dismiss(id)
            setIsLoading(true)
  
            const { error } = await supabase
              .from('surveys')
              .delete()
              .eq('id', survey.id)
  
            if (error) {
              toast.error('설문 삭제 중 오류가 발생했어요.')
              console.error(error)
            } else {
              toast.success(`"${survey.title}" 설문이 삭제되었습니다.`)
              fetchSurveys()
            }
  
            setIsLoading(false)
          }}
        />
      ),
      { id: toastId }
    )
  }
  

  
  useAuthGuard()

  // useEffect(() => {
  //   try {
  //     const raw = localStorage.getItem('litpt_member')
  //     const loggedInMember = raw ? JSON.parse(raw) : null

  //     if (loggedInMember?.member_id) {
  //       setMyMemberId(loggedInMember.member_id)
  //     } else {
  //       console.warn('member_id를 찾을 수 없습니다.')
  //     }
  //   } catch (e) {
  //     console.error('로그인 정보 읽기 실패:', e)
  //   }
  // }, [])

  useEffect(() => {
    if (user?.member_id) {
      setMyMemberId(user.member_id)
    } else {
      setMyMemberId(null)
      console.warn('로그인된 멤버가 없습니다.')
    }
  }, [user])

  const fetchSurveys = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setFilteredSurveys(data ?? [])
    else console.error('설문 목록 불러오기 실패:', error.message)
    setIsLoading(false)
  }

  const handleSearch = async () => {
    const trimmed = keyword.trim()
    if (!trimmed) {
      fetchSurveys()
      return
    }

    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .ilike('title', `%${trimmed}%`)

    if (!error) setFilteredSurveys(data ?? [])
    else console.error('검색 실패:', error.message)
  }

  useEffect(() => {
    fetchSurveys()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <TrainerHeader />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {!selectedSurveyId ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 w-full">
              <h2 className="text-lg font-semibold text-gray-800">설문 관리</h2>

              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="제목으로 검색"
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 text-black placeholder-gray-400"
                  />
                  <span className="absolute left-3 top-2.5 text-gray-400">
                    <Search size={18} />
                  </span>
                </div>

                <Button
                  onClick={handleSearch}
                  variant="click"
                  className="text-sm"
                >
                  <Search size={18} /> 검색
                </Button>

                <Button
                  onClick={() => setIsAddSurveyOpen(true)}
                  variant="click"
                  className="text-sm"
                  >
                  <FilePlus2 size={20} /> 설문 추가
                </Button>

                <Button
                  onClick={() => setIsStartSurveyOpen(true)}
                  variant="click"
                  className="text-sm"
                >
                  <CirclePlay size={20} /> 설문 시작
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center text-gray-500 py-10">설문을 불러오는 중...</div>
            ) : (
              <SurveySearch
                surveys={filteredSurveys}
                onClickSurvey={handleSurveyClick}
                onEditSurvey={handleEditSurvey}
                onDeleteSurvey={handleDeleteSurvey} 
              />
            )}

            {/* AddSurvey 모달 */}
            {myMemberId && (
              <AddSurvey
                open={isAddSurveyOpen}
                onClose={() => setIsAddSurveyOpen(false)}
                onSurveyAdded={() => {
                  fetchSurveys()
                  setIsAddSurveyOpen(false)
                }}
                currentMemberId={myMemberId}
              />
            )}

            {editingSurvey && (
              <EditSurvey
                open={!!editingSurvey}
                survey={editingSurvey}
                onClose={() => setEditingSurvey(null)}
                onSurveyUpdated={() => {
                  fetchSurveys()
                  setEditingSurvey(null)
                }}
              />
            )}

            <SurveyResponseMulti
              open={isStartSurveyOpen}
              onClose={() => setIsStartSurveyOpen(false)}
              onStart={(selectedSurveyIds, mode) => {
                console.log('선택된 설문:', selectedSurveyIds)
                console.log('대상:', mode)
                // 원하는 로직 실행
              }}
            />

          </>
        ) : (
          <SurveyDetail
            surveyId={selectedSurveyId}
            currentMemberId={myMemberId!}
            onBack={handleBackToList}
          />
        )}
      </main>
    </div>
  )
}