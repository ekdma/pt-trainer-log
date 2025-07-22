'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Package } from '@/components/members/types';

interface AddMemberPackageProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  packages: {
    package_id: number
    package_name: string
    valid_date: number
    pt_session_cnt: number
    self_session_cnt: number
    group_session_cnt: number
    price: number
  }[]
  onSelect: (pkg: Package) => void
}

export default function AddMemberPackage({
  open,
  onOpenChange,
  packages,
  onSelect,
}: AddMemberPackageProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[360px] max-h-[500px] overflow-y-auto p-5 rounded-xl shadow-xl border">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-lg text-gray-800 font-semibold">
            등록할 패키지를 선택하세요
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {packages.map((pkg) => (
            <button
              key={pkg.package_id}
              onClick={() => onSelect(pkg)}
              className="w-full text-left rounded-lg border border-gray-300 hover:border-indigo-400 hover:shadow transition bg-gray-50 hover:bg-white p-4"
            >
              <div className="font-semibold text-indigo-700 text-sm">
                {pkg.package_name}
              </div>
              <div className="mt-1 text-sm text-gray-700">
                유효기간: <span className="font-medium">{pkg.valid_date}개월</span>
              </div>
              <div className="mt-1 text-sm text-gray-700">
                PT: <span className="font-medium">{pkg.pt_session_cnt}회</span> / 개인:{" "}
                <span className="font-medium">{pkg.self_session_cnt}회</span> / 그룹:{" "}
                <span className="font-medium">{pkg.group_session_cnt}회</span>
              </div>
              <div className="mt-1 text-sm text-gray-700">
                가격: <span className="font-semibold text-rose-600">{pkg.price.toLocaleString()}원</span>
              </div>
            </button>
          ))}
        </div>

        {/* <div className="text-right mt-5">
          <Button
            size="sm"
            variant="outline"
            className="px-4 py-2 text-sm"
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
        </div> */}
      </DialogContent>
    </Dialog>
  )
}
