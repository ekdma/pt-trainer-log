'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { PackagePlus, PackageSearch as PackageSearchIcon, PackageOpen, PackageMinus, UserRoundSearch } from 'lucide-react'
import { useRouter } from 'next/navigation'
import AddPackageOpen from './AddPackageOpen'
import EditPackageModal from './EditPackageModal'

interface Package {
  package_id: number
  package_name: string
  pt_session_cnt: number
  group_session_cnt: number
  valid_date: number
  price: number
  created_at: string
}

type Props = {
  packages: Package[]
  setPackages: (pkgs: Package[]) => void
  fetchPackages: () => void
}

export default function PackageSearch({ packages, setPackages, fetchPackages }: Props) {
  const [supabase] = useState(getSupabaseClient())
  // const [packages, setPackages] = useState<Package[]>([])
  const [keyword, setKeyword] = useState('')
  const router = useRouter()
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)

  // const fetchPackages = async () => {
  //   const { data, error } = await supabase.from('packages').select('*')
  //   if (error) {
  //     console.error('패키지 불러오기 실패:', error.message)
  //   } else {
  //     setPackages(data ?? [])
  //   }
  // }

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
  
  const handleDeletePackage = async (packageId: number) => {
    if (!supabase) return;
  
    const password = prompt('비밀번호를 입력하세요 🤐');
    if (password !== '2213') {
      alert('비밀번호가 일치하지 않습니다 ❌');
      return;
    }
  
    const confirmDelete = confirm('정말로 이 패키지를 삭제하시겠습니까?');
    if (!confirmDelete) return;
  
    const { error } = await supabase.from('packages').delete().eq('package_id', packageId);
    if (error) {
      alert('패키지 삭제 중 문제가 발생했어요 😥');
      return;
    }
  
    alert('패키지 삭제를 완료하였습니다 🎉');
    fetchPackages(); // 패키지 목록을 다시 불러오는 함수
  };

  useEffect(() => {
    fetchPackages()
  }, [])

  const sortedPackages = [...packages].sort((a, b) =>
    a.package_name.localeCompare(b.package_name, 'ko')
  )

  return (
    <div className="flex flex-col items-center justify-center text-center bg-slate-50 py-8 px-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold text-emerald-600">패키지 관리</h1>
        <p className="text-sm text-gray-500 mt-2">등록된 PT 패키지를 조회하거나 검색해보세요</p>
      </div>

      {/* 검색 영역 */}
      <div className="flex flex-col sm:flex-row items-center justify-center mb-6 space-y-2 sm:space-y-0 sm:space-x-3 w-full max-w-3xl">
        <div className="relative w-full sm:w-auto">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch()
            }}
            placeholder="패키지명을 입력하세요"
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black placeholder-gray-400"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>

        <button
          onClick={handleSearch}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-full shadow-md transition flex justify-center items-center gap-1 text-sm"
        >
          <PackageSearchIcon size={20} /> 검색
        </button>
        <button
          onClick={() => setIsAddPackageOpen(true)}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-full shadow-md transition flex justify-center items-center gap-1 text-sm"
        >
          <PackagePlus size={20} /> 패키지 추가
        </button>
        <button
          onClick={() => router.push('/members')}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-full shadow-md transition flex justify-center items-center gap-1 text-sm"
        >
          <UserRoundSearch size={20} /> 회원
        </button>
      </div>

      {/* 패키지 목록 */}
      <ul className="space-y-3 w-full max-w-md">
        {sortedPackages.map((pkg) => {
          return (
            <li
              key={pkg.package_id}
              className="bg-white border border-emerald-200 rounded-xl px-5 py-3 shadow-sm hover:shadow-md transition duration-300 flex flex-col sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-left">
                <h2 className="text-emerald-800 font-semibold text-lg">
                  {pkg.package_name} {pkg.valid_date}달 개인 {pkg.pt_session_cnt}회 그룹 {pkg.group_session_cnt}회</h2>
                <div className="text-sm text-gray-600 mt-1 space-y-1">
                  <div>PT 세션: {pkg.pt_session_cnt}회</div>
                  <div>그룹 세션: {pkg.group_session_cnt}회</div>
                  <div>유효기간: {pkg.valid_date}달</div>
                  <div>가격: {pkg.price.toLocaleString()}원</div>
                </div>
              </div>

              <div className="flex gap-2 mt-4 sm:mt-0 sm:ml-4 justify-end">
                <button
                  onClick={() => setEditingPackage(pkg)}
                  className="text-indigo-500 hover:text-indigo-700 transition text-sm"
                  title="패키지 수정"
                >
                  <PackageOpen size={18} />
                </button>
                <button
                  onClick={() => handleDeletePackage(pkg.package_id)}
                  className="text-red-500 hover:text-red-700 transition text-sm"
                  title="패키지 삭제"
                >
                  <PackageMinus size={18} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
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
          onClose={() => setIsAddPackageOpen(false)}
          onPackageAdded={() => fetchPackages()}
        />
      )}
    </div>
  )
}
