// MemberPackageCheck.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SupabaseClient } from '@supabase/supabase-js';
import { MemberPackage } from '@/components/members/types';

interface Props {
  isEditPackageOpen: boolean;
  setIsEditPackageOpen: (open: boolean) => void;
  currentPackage: MemberPackage;
  editStartDate: string;
  setEditStartDate: (date: string) => void;
  editEndDate: string;
  setEditEndDate: (date: string) => void;
  editPtSession: number;
  setEditPtSession: (count: number) => void;
  editSelfSession: number;
  setEditSelfSession: (count: number) => void;
  editGroupSession: number;
  setEditGroupSession: (count: number) => void;
  editTrainerId: number | null;
  setEditTrainerId: (id: number | null) => void;
  customPrice: number;
  setCustomPrice: (price: number) => void;
  fetchMemberPackages: () => void;
  supabase: SupabaseClient;
}
export default function MemberPackageCheck({
  isEditPackageOpen,
  setIsEditPackageOpen,
  currentPackage,
  editStartDate,
  setEditStartDate,
  editEndDate,
  setEditEndDate,
  editPtSession,
  setEditPtSession,
  editSelfSession,
  setEditSelfSession,
  editGroupSession,
  setEditGroupSession,
  editTrainerId,
  setEditTrainerId,
  customPrice,
  setCustomPrice,
  fetchMemberPackages,
  supabase
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('member_packages')
      .update({
        start_date: editStartDate,
        end_date: editEndDate,
        pt_session_cnt: editPtSession,
        group_session_cnt: editGroupSession,
        self_session_cnt: editSelfSession,
        trainer_id: editTrainerId,
        price: customPrice,
      })
      .eq('member_package_id', currentPackage.member_package_id);

    setLoading(false);
    if (error) {
      alert('패키지 수정 실패: ' + error.message);
    } else {
      alert('패키지 정보가 수정되었습니다.');
      setIsEditPackageOpen(false);
      fetchMemberPackages();
    }
  };

  return (
    <Dialog open={isEditPackageOpen} onOpenChange={setIsEditPackageOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">패키지 정보 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">PT 세션</label>
              <input
                type="number"
                value={editPtSession}
                onChange={(e) => setEditPtSession(Number(e.target.value))}
                className="w-full border rounded px-2 py-1 text-center"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">개인운동</label>
              <input
                type="number"
                value={editSelfSession}
                onChange={(e) => setEditSelfSession(Number(e.target.value))}
                className="w-full border rounded px-2 py-1 text-center"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">그룹 세션</label>
              <input
                type="number"
                value={editGroupSession}
                onChange={(e) => setEditGroupSession(Number(e.target.value))}
                className="w-full border rounded px-2 py-1 text-center"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">트레이너 ID</label>
              <input
                type="number"
                value={editTrainerId ?? ''}
                onChange={(e) => setEditTrainerId(Number(e.target.value))}
                className="w-full border rounded px-2 py-1 text-center"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">시작일</label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full border rounded px-2 py-1 text-center"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">종료일</label>
              <input
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="w-full border rounded px-2 py-1 text-center"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">금액</label>
            <input
              type="number"
              value={customPrice}
              onChange={(e) => setCustomPrice(Number(e.target.value))}
              className="w-full border rounded px-2 py-1 text-center"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleSave}
            disabled={loading}
          >
            저장
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsEditPackageOpen(false)}
            className="px-4 py-2 text-sm"
          >
            취소
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
