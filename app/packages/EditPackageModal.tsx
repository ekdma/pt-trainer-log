'use client'

import { PackagePlus } from 'lucide-react'
import { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'

type Package = {
  package_id: number
  package_name: string
  pt_session_cnt: number
  group_session_cnt: number
  valid_date: number
  price: number
}

export default function EditPackageModal({
  pkg,
  onClose,
  onUpdate,
  supabase,
}: {
  pkg: Package
  onClose: () => void
  onUpdate: () => void
  supabase: SupabaseClient
}) {
  const [formData, setFormData] = useState<Package>(pkg)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'package_name' ? value : Number(value) || 0,
    }));
  }

  const handleSubmit = async () => {
    setErrorMsg('')
    setLoading(true)

    const updates = {
      package_name: formData.package_name,
      pt_session_cnt: formData.pt_session_cnt,
      group_session_cnt: formData.group_session_cnt,
      valid_date: formData.valid_date,
      price: formData.price,
    }

    const { error } = await supabase
      .from('packages')
      .update(updates)
      .eq('package_id', formData.package_id)

    setLoading(false)

    if (error) {
      setErrorMsg('패키지 수정 중 문제가 발생했어요 😥')
    } else {
      alert('패키지를 성공적으로 수정했어요 ✅')
      onUpdate()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md max-h-screen overflow-auto">
        <h2 className="flex justify-center items-center gap-2 text-xl font-semibold text-gray-800 mb-6 w-full">
          <PackagePlus size={20} />
          패키지 정보 수정
        </h2>

        {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">패키지명</label>
          <input
            type="text"
            name="package_name"
            value={formData.package_name}
            onChange={handleChange}
            className="text-sm w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="mb-4 flex space-x-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">유효기간 (월)</label>
            <input
              type="text"
              name="valid_date"
              value={formData.valid_date}
              onChange={handleChange}
              className="text-sm w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none text-center"
              min={1}
            />
          </div>

          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">가격 (원)</label>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handleChange}
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
              name="pt_session_cnt"
              value={formData.pt_session_cnt}
              onChange={handleChange}
              className="text-sm w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none text-center"
              min={0}
            />
          </div>

          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">그룹 세션 횟수</label>
            <input
              type="text"
              name="group_session_cnt"
              value={formData.group_session_cnt}
              onChange={handleChange}
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
            {loading ? '수정 중...' : '수정'}
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
