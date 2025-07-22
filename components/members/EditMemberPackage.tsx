import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SupabaseClient } from '@supabase/supabase-js';

type Trainer = {
  trainer_id: number;
  name: string;
};

type Package = {
  package_name: string;
};

type CurrentPackage = {
  member_package_id: number;
  start_date: string;
  end_date: string;
  pt_session_cnt: number;
  group_session_cnt: number;
  self_session_cnt: number;
  trainer_id: number | null;
  price: number;
  packages?: Package;
};

type Props = {
  currentPackage: CurrentPackage;
  editPtSession: number;
  setEditPtSession: (val: number) => void;
  editSelfSession: number;
  setEditSelfSession: (val: number) => void;
  editGroupSession: number;
  setEditGroupSession: (val: number) => void;
  editTrainerId: number | null;
  setEditTrainerId: (val: number) => void;
  editStartDate: string;
  setEditStartDate: (val: string) => void;
  editEndDate: string;
  setEditEndDate: (val: string) => void;
  customPrice: number;
  setCustomPrice: (val: number) => void;
  trainers: Trainer[];
  supabase: SupabaseClient;
  fetchMemberPackages: () => void;
  setIsOpen: (val: boolean) => void;
};

function formatPrice(value: string) {
  if (!value) return '';
  return Number(value).toLocaleString();
}

export default function EditMemberPackage({
  currentPackage,
  editPtSession,
  setEditPtSession,
  editSelfSession,
  setEditSelfSession,
  editGroupSession,
  setEditGroupSession,
  editTrainerId,
  setEditTrainerId,
  editStartDate,
  setEditStartDate,
  editEndDate,
  setEditEndDate,
  customPrice,
  setCustomPrice,
  trainers,
  supabase,
  fetchMemberPackages,
  setIsOpen,
}: Props) {
  const handleSave = async () => {
    const { error } = await supabase
      .from("member_packages")
      .update({
        start_date: editStartDate,
        end_date: editEndDate,
        pt_session_cnt: editPtSession,
        group_session_cnt: editGroupSession,
        self_session_cnt: editSelfSession,
        trainer_id: editTrainerId,
        price: customPrice,
      })
      .eq("member_package_id", currentPackage.member_package_id);

    if (error) {
      alert("패키지 수정 실패: " + error.message);
    } else {
      alert("패키지 정보가 수정되었습니다.");
      setIsOpen(false);
      fetchMemberPackages();
    }
  };

  return (
    <Dialog open onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{currentPackage.packages?.package_name}</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4 text-sm text-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">PT 세션</label>
              <input
                type="number"
                min={0}
                value={editPtSession}
                onChange={(e) => setEditPtSession(Number(e.target.value))}
                className="w-full border rounded px-2 py-1 text-center"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">개인운동</label>
              <input
                type="number"
                min={0}
                value={editSelfSession}
                onChange={(e) => setEditSelfSession(Number(e.target.value))}
                className="w-full border rounded px-2 py-1 text-center"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">그룹 세션</label>
              <input
                type="number"
                min={0}
                value={editGroupSession}
                onChange={(e) => setEditGroupSession(Number(e.target.value))}
                className="w-full border rounded px-2 py-1 text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">가격 (원)</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatPrice(customPrice.toString())}
                onChange={(e) => {
                  const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                  setCustomPrice(Number(onlyNums));
                }}
                className="w-full border rounded px-2 py-1 text-center"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500">트레이너</label>
              <select
                value={editTrainerId ?? ''}
                onChange={(e) => setEditTrainerId(Number(e.target.value))}
                className="w-full border rounded px-2 py-1 text-center"
              >
                <option value="" disabled>
                  선택
                </option>
                {trainers.map((trainer) => (
                  <option key={trainer.trainer_id} value={trainer.trainer_id}>
                    {trainer.name}
                  </option>
                ))}
              </select>
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
        </div>

        <DialogFooter className="mt-6">
          <Button 
            variant="ghost"
            className="text-sm"
            onClick={() => setIsOpen(false)}
          >
            닫기
          </Button>
          <Button
            onClick={handleSave}
            variant="darkGray" 
            className="text-sm"
          >
            저장
          </Button>
          {/* <Button variant="save" onClick={handleSave}>
            저장
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            취소
          </Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
