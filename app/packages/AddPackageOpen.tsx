'use client'

import { PackagePlus } from 'lucide-react'
import { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

type Props = {
  onClose: () => void
  onPackageAdded: () => void
}

export default function AddPackageOpen({ onClose, onPackageAdded }: Props) {
  const supabase: SupabaseClient = getSupabaseClient()
  const [ptCount, setPtCount] = useState<string>('0')
  const [groupCount, setGroupCount] = useState<string>('0')
  const [validDays, setValidDays] = useState<string>('1')  // 유효기간은 기본 1로
  const [price, setPrice] = useState<string>('0')

  const [packageName, setPackageName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async () => {
    setErrorMsg('')

    // handleSubmit 내부에서 숫자로 변환
    const pt = Number(ptCount)
    const group = Number(groupCount)
    const valid = Number(validDays)
    const cost = Number(price)

    if (!packageName.trim()) {
      setErrorMsg('패키지명을 입력하세요')
      return
    }

    if (
      isNaN(pt) || isNaN(group) || isNaN(valid) || isNaN(cost) ||
      valid <= 0 || pt < 0 || group < 0 || cost < 0
    ) {
      setErrorMsg('입력 값이 올바르지 않습니다')
      return
    }

    setLoading(true)

    const { error } = await supabase.from('packages').insert([
      {
        package_name: packageName,
        pt_session_cnt: pt,
        group_session_cnt: group,
        valid_date: valid,
        price: cost,
      },
    ])

    setLoading(false)

    if (error) {
      setErrorMsg(error.message)
      alert('패키지 추가 중 문제가 발생했어요 😥')
    } else {
      alert('패키지 추가를 완료하였습니다 😊')
      onPackageAdded()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md max-h-screen overflow-auto">
        <h2 className="flex justify-center items-center gap-2 text-xl font-semibold text-gray-800 mb-6 w-full">
          <PackagePlus size={20} />
          신규 패키지 등록
        </h2>

        {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">패키지명</label>
          <input
            type="text"
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
            placeholder="예: 라이트, 스탠다드, 프리미엄"
            className="text-sm w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="mb-4 flex space-x-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">유효기간 (월)</label>
            <input
              type="text"
              value={validDays}
              onChange={(e) => setValidDays(e.target.value)}
              className="text-sm w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none text-center"
              min={1}
            />
          </div>

          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">가격 (원)</label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="text-sm w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none text-center"
              min={0}
            />
          </div>
        </div>

        <div className="mb-4 flex space-x-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">PT 세션 횟수</label>
            <input
              type="text"
              value={ptCount}
              onChange={(e) => setPtCount(e.target.value)}
              className="text-sm w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none text-center"
              min={0}
            />
          </div>

          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">그룹 세션 횟수</label>
            <input
              type="text"
              value={groupCount}
              onChange={(e) => setGroupCount(e.target.value)}
              className="text-sm w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none text-center"
              min={0}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            variant="outline"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded transition"
          >
            {loading ? '등록 중...' : '등록'}
          </Button>
          <Button
            onClick={onClose}
            disabled={loading}
            variant="outline"
            type="button"
            className="px-4 py-2 text-sm"
          >
            취소
          </Button>
        </div>
      </div>
    </div>
  )
}
