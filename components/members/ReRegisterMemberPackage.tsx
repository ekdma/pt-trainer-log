'use client'

import React, { useState, useEffect } from 'react';
import { PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Package, Trainer } from '@/components/members/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { endOfMonth, addMonths, format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedPackage: Package | null;
  setSelectedPackage: (v: Package | null) => void;
  packages: Package[];
  memberId: number;
  trainers: Trainer[];
  supabase: SupabaseClient;
  showPackagePopup: boolean;
  setShowPackagePopup: (v: boolean) => void;
  fetchMemberPackages: () => void;
}

export default function ReRegisterMemberPackage({
  open,
  onOpenChange,
  selectedPackage,
  setSelectedPackage,
  packages,
  memberId,
  trainers,
  supabase,
  showPackagePopup,
  setShowPackagePopup,
  fetchMemberPackages,
}: Props) {
  // Form States
  const [editPtSession, setEditPtSession] = useState(0);
  const [editSelfSession, setEditSelfSession] = useState(0);
  const [editGroupSession, setEditGroupSession] = useState(0);
  const [customPrice, setCustomPrice] = useState(0);
  const [editTrainerId, setEditTrainerId] = useState<number | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  useEffect(() => {
    if (selectedPackage) {
      const today = new Date();
      const formattedToday = format(today, 'yyyy-MM-dd');
  
      const calculatedEndDate = format(
        endOfMonth(addMonths(today, selectedPackage.valid_date)),
        'yyyy-MM-dd'
      );
  
      setEditPtSession(selectedPackage.pt_session_cnt ?? 0);
      setEditSelfSession(selectedPackage.self_session_cnt ?? 0);
      setEditGroupSession(selectedPackage.group_session_cnt ?? 0);
      setCustomPrice(selectedPackage.price ?? 0);
      setEditTrainerId(null);
      setEditStartDate(formattedToday);
      setEditEndDate(calculatedEndDate);
    }
  }, [selectedPackage]);
  
  const formatPrice = (value: string) => {
    const num = value.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleSave = async () => {
    if (!editStartDate || !editEndDate) {
      alert('시작일과 종료일을 입력해주세요.');
      return;
    }
    if (!editTrainerId) {
      alert('트레이너를 선택해주세요.');
      return;
    }
  
    // 1. 기존 패키지 status = 'closed' 처리
    const { error: updateError } = await supabase
      .from('member_packages')
      .update({ status: 'closed' })
      .eq('member_id', memberId)
      .eq('status', 'active');
  
    if (updateError) {
      alert('기존 패키지 만료 처리 실패: ' + updateError.message);
      return;
    }
  
    // 2. 새 패키지 등록
    const { error: insertError } = await supabase.from('member_packages').insert([
      {
        member_id: memberId,
        package_id: selectedPackage?.package_id,
        trainer_id: editTrainerId,
        pt_session_cnt: editPtSession,
        group_session_cnt: editGroupSession,
        self_session_cnt: editSelfSession,
        price: customPrice,
        start_date: editStartDate,
        end_date: editEndDate,
        status: 'active',
      },
    ]);
  
    if (insertError) {
      alert('패키지 등록 실패: ' + insertError.message);
    } else {
      alert('패키지 재등록 완료 ✅');
      setSelectedPackage(null);
      setShowPackagePopup(false);
      fetchMemberPackages();
      onOpenChange(false);
    }
  };

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg);
    setShowPackagePopup(false);
    onOpenChange(true);  
  };
  
  return (
    <>
      {showPackagePopup && (
        <Dialog open={showPackagePopup} onOpenChange={setShowPackagePopup}>
          <DialogContent className="max-w-sm p-5 rounded-xl overflow-y-auto max-h-[90vh]">
            <DialogHeader className="relative">
              <DialogTitle className="text-lg font-semibold text-gray-800">
                재등록할 패키지를 선택하세요
              </DialogTitle>
              {/* <DialogClose asChild>
                <button className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 transition">
                  <X size={20} />
                </button>
              </DialogClose> */}
            </DialogHeader>
        
            <div className="space-y-3 mt-4">
              {packages.map((pkg) => (
                <button
                  key={pkg.package_id}
                  onClick={() => handlePackageSelect(pkg)}
                  className="w-full text-left rounded-lg border border-gray-300 hover:border-indigo-400 hover:shadow transition bg-gray-50 hover:bg-white p-4"
                >
                  <div className="font-semibold text-indigo-700 text-sm">
                    {pkg.package_name}
                  </div>
                  <div className="mt-1 text-sm text-gray-700">
                    유효기간: <span className="font-medium">{pkg.valid_date}개월</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-700">
                    PT: {pkg.pt_session_cnt} / 개인: {pkg.self_session_cnt} / 그룹: {pkg.group_session_cnt}
                  </div>
                  <div className="mt-1 text-sm text-gray-700">
                    가격: <span className="text-rose-600 font-semibold">{pkg.price.toLocaleString()}원</span>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedPackage && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-md rounded-xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-700 font-semibold text-lg">
                <PackagePlus size={20} /> 재등록 패키지 - {selectedPackage.package_name} ({selectedPackage.valid_date}개월)
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 space-y-4 text-gray-700 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500">PT 세션</label>
                  <input type="number" min={0} value={editPtSession} onChange={(e) => setEditPtSession(Number(e.target.value))} className="w-full border rounded px-2 py-1 text-center" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">개인운동</label>
                  <input type="number" min={0} value={editSelfSession} onChange={(e) => setEditSelfSession(Number(e.target.value))} className="w-full border rounded px-2 py-1 text-center" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">그룹 세션</label>
                  <input type="number" min={0} value={editGroupSession} onChange={(e) => setEditGroupSession(Number(e.target.value))} className="w-full border rounded px-2 py-1 text-center" />
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
                    <option value="" disabled>선택</option>
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
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setEditStartDate(newStart);

                        if (selectedPackage?.valid_date) {
                          const calculatedEndDate = format(
                            endOfMonth(addMonths(parseISO(newStart), selectedPackage.valid_date)),
                            'yyyy-MM-dd'
                          );
                          setEditEndDate(calculatedEndDate);
                        }
                      }}
                      className="w-full border rounded px-2 py-1 text-center"
                    />
                </div>
                <div>
                  <label className="text-xs text-gray-500">종료일</label>
                  <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="w-full border rounded px-2 py-1 text-center" />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  setSelectedPackage(null);
                  setShowPackagePopup(false);
                }}
              >
                취소
              </Button>
              <Button onClick={handleSave}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}