'use client'

import { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PackagePlus } from 'lucide-react'

type Package = {
  package_id: number
  package_name: string
  pt_session_cnt: number
  group_session_cnt: number
  self_session_cnt: number
  valid_date: number
  price: number
}

function formatPrice(value: number | string) {
  if (!value) return ''
  return Number(value).toLocaleString()
}

export default function EditPackageModal({
  pkg,
  onClose,
  onUpdate,
  supabase
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
      [name]: name === 'package_name' ? value : Number(value) || 0
    }))
  }

  const handleSubmit = async () => {
    setErrorMsg('')
    setLoading(true)

    const updates = {
      package_name: formData.package_name,
      pt_session_cnt: formData.pt_session_cnt,
      group_session_cnt: formData.group_session_cnt,
      self_session_cnt: formData.self_session_cnt,
      valid_date: formData.valid_date,
      price: formData.price
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
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus size={20} />
            패키지 정보 수정
          </DialogTitle>
          <DialogDescription>패키지 정보를 수정하고 저장하세요.</DialogDescription>
        </DialogHeader>

        {errorMsg && <p className="text-red-500 text-sm mb-2">{errorMsg}</p>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">패키지명</label>
            <input
              type="text"
              name="package_name"
              value={formData.package_name}
              onChange={handleChange}
              className="text-sm w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
            />
          </div>

          <div className="flex space-x-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">유효기간 (월)</label>
              <input
                type="text"
                name="valid_date"
                value={formData.valid_date}
                onChange={handleChange}
                className="text-sm w-full p-2 border border-gray-300 text-center rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">가격 (원)</label>
              <input
                type="text"
                name="price"
                value={formatPrice(formData.price)}
                onChange={(e) => {
                  const onlyNums = e.target.value.replace(/[^0-9]/g, '')
                  const asNumber = Number(onlyNums)
                  setFormData((prev) => ({ ...prev, price: asNumber }))
                }}
                className="text-sm w-full p-2 border border-gray-300 text-center rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="flex space-x-4">
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">PT 세션 횟수</label>
              <input
                type="text"
                name="pt_session_cnt"
                value={formData.pt_session_cnt}
                onChange={handleChange}
                className="text-sm w-full p-2 border border-gray-300 text-center rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
              />
            </div>
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">개인운동 횟수</label>
              <input
                type="text"
                name="self_session_cnt"
                value={formData.self_session_cnt}
                onChange={handleChange}
                className="text-sm w-full p-2 border border-gray-300 text-center rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
              />
            </div>
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">그룹 세션 횟수</label>
              <input
                type="text"
                name="group_session_cnt"
                value={formData.group_session_cnt}
                onChange={handleChange}
                className="text-sm w-full p-2 border border-gray-300 text-center rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button 
            variant="ghost"
            className="text-sm"
            onClick={onClose}
          >
            닫기
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            variant="darkGray" 
            className="text-sm"
          >
            {loading ? '저장 중...' : '저장'}
          </Button>
          {/* <Button onClick={handleSubmit} disabled={loading} variant="save">
            {loading ? '수정 중...' : '수정'}
          </Button>
          <Button onClick={onClose} disabled={loading} variant="outline">
            취소
          </Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
