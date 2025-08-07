'use client'

import { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
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
import { toast } from 'sonner'

type Props = {
  open: boolean
  onClose: () => void
  onPackageAdded: () => void
}

function formatPrice(value: string) {
  if (!value) return ''
  return Number(value).toLocaleString()
}

export default function AddPackageOpen({ open, onClose, onPackageAdded }: Props) {
  const supabase: SupabaseClient = getSupabaseClient()
  const [ptCount, setPtCount] = useState('0')
  const [groupCount, setGroupCount] = useState('0')
  const [selfCount, setSelfCount] = useState('0')
  const [validDays, setValidDays] = useState('1')
  const [price, setPrice] = useState('0')
  const [packageName, setPackageName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async () => {
    setErrorMsg('')
    const pt = Number(ptCount)
    const self = Number(selfCount)
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
        self_session_cnt: self,
        group_session_cnt: group,
        valid_date: valid,
        price: cost,
      },
    ])

    setLoading(false)

    if (error) {
      setErrorMsg(error.message)
      // alert('패키지 추가 중 문제가 발생했어요 😥')
      toast.error('패키지 추가 중 문제가 발생했어요 😥')
    } else {
      // alert('패키지 추가를 완료하였습니다 😊')
      toast.success('패키지 추가를 완료하였습니다 😊')
      onPackageAdded()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus size={20} />
            신규 패키지 등록
          </DialogTitle>
          <DialogDescription>새로운 패키지 정보를 입력하고 저장하세요.</DialogDescription>
        </DialogHeader>

        {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">패키지명</label>
            <input
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="예: Start, Core, Routine"
              className="text-sm w-full p-2 border border-gray-300 text-gray-700 rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
            />
          </div>

          <div className="flex space-x-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">유효기간 (월)</label>
              <input
                type="text"
                value={validDays}
                onChange={(e) => setValidDays(e.target.value)}
                className="text-sm w-full p-2 border border-gray-300 text-center rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">가격 (원)</label>
              <input
                type="text"
                value={formatPrice(price)}
                onChange={(e) => {
                  const onlyNums = e.target.value.replace(/[^0-9]/g, '')
                  setPrice(onlyNums)
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
                value={ptCount}
                onChange={(e) => setPtCount(e.target.value)}
                className="text-sm w-full p-2 border border-gray-300 text-center rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
              />
            </div>
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">개인운동 횟수</label>
              <input
                type="text"
                value={selfCount}
                onChange={(e) => setSelfCount(e.target.value)}
                className="text-sm w-full p-2 border border-gray-300 text-center rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
              />
            </div>
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">그룹 세션 횟수</label>
              <input
                type="text"
                value={groupCount}
                onChange={(e) => setGroupCount(e.target.value)}
                className="text-sm w-full p-2 border border-gray-300 text-center rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          {/* <Button onClick={handleSubmit} disabled={loading} variant="save">
            {loading ? '등록 중...' : '등록'}
          </Button>
          <Button onClick={onClose} disabled={loading} variant="outline">
            취소
          </Button> */}
          <Button 
            variant="ghost"
            className="text-sm"
            onClick={onClose}
            disabled={loading}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
