'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PackageMinus } from "lucide-react"
import { MemberPackage } from '@/components/members/types';

interface BeforeMemberPackageProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberPackages: MemberPackage[]
  today: string
}

export default function BeforeMemberPackage({ open, onOpenChange, memberPackages, today }: BeforeMemberPackageProps) {
  const pastPackages = memberPackages.filter((p) => p.end_date < today || p.status === 'closed')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-6 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg text-gray-800 font-semibold">이전 패키지</DialogTitle>
        </DialogHeader>

        <div className="mt-2 text-sm space-y-4">
          {pastPackages.map((pkg) => (
            <div
              key={pkg.member_package_id}
              className="p-4 rounded-xl shadow-sm border border-gray-200 bg-gray-100 space-y-3"
            >
              <div className="flex items-center gap-2 text-gray-700 font-semibold text-base">
                <PackageMinus size={18} />
                {pkg.status === 'closed' ? '종료된 패키지' : '기간이 지난 패키지'}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-gray-500">패키지명</span>
                  <div className="font-medium text-gray-800">{pkg.packages?.package_name ?? '패키지명 없음'}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">트레이너</span>
                  <div className="text-gray-800">{pkg.trainers?.name ?? '미지정'}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">수강 기간</span>
                  <div className="text-gray-800">
                    {pkg.start_date} <br /> ~ <br /> {pkg.end_date}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">가격</span>
                  <div className="text-gray-800">{pkg.price?.toLocaleString() ?? '0'}원</div>
                </div>
              </div>

              <div className="mb-2 flex flex-col md:flex-row md:items-start md:gap-4">
                <div className="md:w-1/3">
                  <span className="text-xs text-gray-500">PT 세션</span>
                  <div className="text-gray-800">{pkg.pt_session_cnt}회</div>
                </div>
                <div className="md:w-1/3">
                  <span className="text-xs text-gray-500">개인운동</span>
                  <div className="text-gray-800">{pkg.self_session_cnt}회</div>
                </div>
                <div className="md:w-1/3">
                  <span className="text-xs text-gray-500">그룹 세션</span>
                  <div className="text-gray-800">{pkg.group_session_cnt}회</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
