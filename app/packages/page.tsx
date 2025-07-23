'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import TrainerHeader from '@/components/layout/TrainerHeader'
import PackageSearch from '@/components/packages/PackageSearch'
import EditPackageModal from '@/components/packages/EditPackageModal'
import AddPackageOpen from '@/components/packages/AddPackageOpen'
import { Search, PackagePlus, PackageSearch as PackageSearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Package {
  package_id: number
  package_name: string
  pt_session_cnt: number
  group_session_cnt: number
  self_session_cnt: number
  valid_date: number
  price: number
  created_at: string
}

export default function PackageListPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [keyword, setKeyword] = useState('')
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const supabase = getSupabaseClient()

  useAuthGuard()

  const fetchPackages = async () => {
    const { data, error } = await supabase.from('packages').select('*')
    if (!error) setPackages(data ?? [])
    else console.error('패키지 불러오기 실패:', error.message)
  }

  const handleSearch = async () => {
    if (!keyword.trim()) {
      fetchPackages()
      return
    }

    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .ilike('package_name', `%${keyword}%`)

    if (error) {
      console.error('검색 실패:', error.message)
    } else {
      setPackages(data ?? [])
    }
  }

  useEffect(() => {
    fetchPackages()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <TrainerHeader />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 w-full">
          {/* 좌측: 제목 */}
          <h2 className="text-lg font-semibold text-gray-800">패키지 관리</h2>

          {/* 우측: 검색창 + 버튼들 */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* 검색창 */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
                placeholder="패키지명을 입력하세요"
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 text-black placeholder-gray-400"
              />
              <span className="absolute left-3 top-2.5 text-gray-400"><Search size={18} /></span>
            </div>

            {/* 버튼들 */}
            <Button
              onClick={handleSearch}
              variant="click"
              className="text-sm"
            >
              <PackageSearchIcon size={20} /> 검색
            </Button>

            <Button
              onClick={() => setIsAddPackageOpen(true)}
              variant="click"
              className="text-sm"
            >
              <PackagePlus size={20} /> 패키지 추가
            </Button>
          </div>
        </div>


        {/* 패키지 목록만 보여주는 컴포넌트 */}
        <PackageSearch
          packages={packages}
          setPackages={setPackages}
          fetchPackages={fetchPackages}
          setEditingPackage={setEditingPackage}
        />
      </main>

      {editingPackage && (
        <EditPackageModal
          pkg={editingPackage}
          onClose={() => setEditingPackage(null)}
          onUpdate={fetchPackages}
          supabase={supabase}
        />
      )}

      {isAddPackageOpen && (
        <AddPackageOpen
          open={isAddPackageOpen}
          onClose={() => setIsAddPackageOpen(false)}
          onPackageAdded={fetchPackages}
        />
      )}
    </div>
  )
}
