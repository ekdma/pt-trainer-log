'use client'

import { getSupabaseClient } from '@/lib/supabase'
import { PackageOpen, PackageMinus } from 'lucide-react'
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

type Props = {
  packages: Package[]
  setPackages: (pkgs: Package[]) => void
  fetchPackages: () => void
  setEditingPackage: (pkg: Package) => void
}

export default function PackageSearch({
  packages,
  fetchPackages,
  setEditingPackage,
}: Props) {
  const supabase = getSupabaseClient()

  const handleDeletePackage = async (packageId: number) => {
    const password = prompt('비밀번호를 입력하세요 🤐')
    if (password !== '2213') {
      alert('비밀번호가 일치하지 않습니다 ❌')
      return
    }
  
    const confirmDelete = confirm('정말로 이 패키지를 삭제하시겠습니까?')
    if (!confirmDelete) return
  
    // 🔥 먼저 참조 테이블(member_packages)에서 삭제
    const { error: refError } = await supabase
      .from('member_packages')
      .delete()
      .eq('package_id', packageId)
  
    if (refError) {
      console.error('참조 테이블 삭제 오류:', refError.message)
      alert('참조 테이블 삭제 중 오류 발생 😥\n\n' + refError.message)
      return
    }
  
    // ✅ 실제 packages 테이블에서 삭제
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('package_id', packageId)
  
    if (error) {
      console.error('패키지 삭제 오류:', error.message)
      alert('패키지 삭제 중 오류 발생 😥\n\n' + error.message)
      return
    }
  
    alert('패키지 삭제를 완료하였습니다 🎉')
    fetchPackages()
  }
  

  const sortedPackages = [...packages].sort((a, b) =>
    a.package_name.localeCompare(b.package_name, 'ko')
  )

  return (
    <ul className="space-y-4 w-full max-w-3xl mx-auto">
      {sortedPackages.map((pkg) => (
        <li
          key={pkg.package_id}
          className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm hover:shadow-md transition duration-300 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex-1">
            <h2 className="text-gray-800 font-bold text-lg">
              {pkg.package_name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium text-gray-700">{pkg.valid_date}달</span> 유효 
            </p>
            <p className="text-sm text-gray-600 mt-1">
              PT <span className="font-semibold">{pkg.pt_session_cnt}</span>회 •
              개인운동 <span className="font-semibold">{pkg.self_session_cnt}</span>회 •
              그룹운동 <span className="font-semibold">{pkg.group_session_cnt}</span>회
            </p>
            <p className="text-sm text-gray-500 mt-1">
              가격: <span className="font-semibold">{pkg.price.toLocaleString()}원</span>
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              onClick={() => setEditingPackage(pkg)}
              variant="ghost"
              className="font-semibold bg-white border border-transparent text-indigo-700 hover:bg-indigo-300 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
              title="패키지 수정"
            >
              <PackageOpen size={16} />
              수정
            </Button>

            <Button
              onClick={() => handleDeletePackage(pkg.package_id)}
              variant="ghost"
              className="font-semibold bg-white border border-transparent text-red-600 hover:bg-red-100 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
              title="패키지 삭제"
            >
              <PackageMinus size={16} />
              삭제
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}