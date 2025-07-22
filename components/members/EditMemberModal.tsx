'use client'

import { UserRoundPen, PackagePlus, PackageMinus, PackageOpen } from 'lucide-react'
import { useState, useEffect } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { Member, MemberPackage, Package, Trainer } from './types'
import { Button } from '@/components/ui/button'
import dayjs from 'dayjs'
import EditMemberPackage from "@/components/members/EditMemberPackage";
import ReRegisterMemberPackage from "@/components/members/ReRegisterMemberPackage";
import BeforeMemberPackage from "@/components/members/BeforeMemberPackage";

function formatPrice(value: string) {
  if (!value) return '';
  return Number(value).toLocaleString();
}

export default function EditMemberModal({
  member,
  onClose,
  onUpdate,
  supabase,
}: {
  member: Member
  onClose: () => void
  onUpdate: () => void
  supabase: SupabaseClient
}) {
  const [formData, setFormData] = useState<Member>(member)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [showPackageHistory, setShowPackageHistory] = useState(false)

  const [memberPackages, setMemberPackages] = useState<MemberPackage[]>([])
  const [currentPackage, setCurrentPackage] = useState<MemberPackage | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [showPackagePopup, setShowPackagePopup] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [customPt, setCustomPt] = useState(0)
  const [customGroup, setCustomGroup] = useState(0)
  const [customSelf, setCustomSelf] = useState(0)
  const [customPrice, setCustomPrice] = useState(0)
  const [startDate, setStartDate] = useState<string>(() => dayjs().format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState<string>(() => dayjs().add(1, 'month').format('YYYY-MM-DD'))

  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(null)

  const [isEditPackageOpen, setIsEditPackageOpen] = useState(false)

  // 수정용 상태 (초기값은 currentPackage 값으로 세팅)
  const [editPtSession, setEditPtSession] = useState(0)
  const [editGroupSession, setEditGroupSession] = useState(0)
  const [editSelfSession, setEditSelfSession] = useState(0)
  const [editTrainerId, setEditTrainerId] = useState<number | null>(null)
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')

  useEffect(() => {
    const fetchTrainers = async () => {
      const { data, error } = await supabase
        .from('trainers')
        .select('trainer_id, name')
        .eq('is_active', true)
      if (error) {
        console.error('트레이너 목록 불러오기 실패:', error.message)
      } else {
        setTrainers(data)
      }
    }
  
    fetchTrainers()
  }, [])

  useEffect(() => {
    if (!startDate || !selectedPackage?.valid_date) return;
  
    const start = new Date(startDate);
    const monthOffset = selectedPackage.valid_date;
  
    // 계산: valid_date 개월 후 → 해당 월의 마지막 날
    const end = new Date(start.getFullYear(), start.getMonth() + monthOffset + 1, 0);
    const formattedEnd = end.toISOString().slice(0, 10); // YYYY-MM-DD
    setEndDate(formattedEnd);
  }, [startDate, selectedPackage?.valid_date]);
  const fetchMemberPackages = async () => {
    const { data, error } = await supabase
      .from('member_packages')
      .select(`
        *,
        packages:package_id (
          package_id,
          package_name,
          pt_session_cnt,
          group_session_cnt,
          self_session_cnt,
          price
        ),
        trainers(*)
      `)
      .eq('member_id', member.member_id)
      .order('start_date', { ascending: false })

    if (!error && data) {
      setMemberPackages(data)
      // 현재 활성 패키지 찾기 (오늘 날짜 기준)
      const current = data.find(
        (pkg) => pkg.start_date <= today && pkg.end_date >= today && pkg.status == 'active'
      )
      setCurrentPackage(current || null)
    } else {
      setMemberPackages([])
      setCurrentPackage(null)
      console.error('패키지 조회 실패:', error)
    }
  }

  const fetchPackages = async () => {
    const { data } = await supabase
      .from('packages')
      .select('*')
      .order('valid_date, package_name, pt_session_cnt, self_session_cnt, group_session_cnt', { ascending: true }) 
    setPackages(data || [])
  }

  useEffect(() => {
    fetchMemberPackages()
    fetchPackages()
  }, [])

  useEffect(() => {
    if (showPackageHistory) {
      fetchMemberPackages()
    }
  }, [showPackageHistory])

  const openEditPackage = () => {
    if (!currentPackage) return;
  
    setEditStartDate(currentPackage.start_date);
    setEditEndDate(currentPackage.end_date);
    setEditPtSession(currentPackage.pt_session_cnt);
    setEditGroupSession(currentPackage.group_session_cnt);
    setEditSelfSession(currentPackage.self_session_cnt);
    setEditTrainerId(currentPackage.trainer_id ?? null);
    setCustomPrice(currentPackage.price ?? 0);  
    setIsEditPackageOpen(true);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    setErrorMsg('');
    setLoading(true);

    const updates: {
      name: string;
      birth_date: string | null;
      join_date: string | null;
      sex: string;
      level: string;
      before_level?: string;
      modified_dt?: string;
      phone?: string;
    } = {
      name: formData.name,
      birth_date: formData.birth_date,
      join_date: formData.join_date,
      sex: formData.sex,
      level: formData.level,
      phone: formData.phone,
    };

    if (formData.level !== member.level) {
      updates.before_level = member.level;
      updates.modified_dt = new Date().toISOString();
    }

    const { error } = await supabase
      .from('members')
      .update(updates)
      .eq('member_id', formData.member_id);

    
    const memberId = formData.member_id

    if (selectedPackage) {
      const { error: closeErr } = await supabase
        .from('member_packages')
        .update({ status: 'closed' })
        .eq('member_id', memberId)
        .eq('status', 'active');
  
      if (closeErr) {
        console.error('기존 패키지 상태 변경 실패:', closeErr.message);
      }
  
      const { error: pkgErr } = await supabase.from('member_packages').insert([
        {
          member_id: memberId,
          package_id: selectedPackage.package_id,
          trainer_id: selectedTrainerId,
          pt_session_cnt: customPt,
          group_session_cnt: customGroup,
          self_session_cnt: customSelf,
          price: customPrice,
          start_date: startDate,
          end_date: endDate,
          status: 'active',
        },
      ]);
  
      if (pkgErr) {
        alert('회원은 수정되었지만 패키지 등록에 실패했습니다');
      }
    }
  
    setLoading(false)

    if (error) {
      setErrorMsg('회원 정보 수정 중 문제가 발생했어요 😥');
    } else {
      alert('회원 정보를 성공적으로 수정했어요 ✅');
      onUpdate();
      onClose();
    }
  }

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg)
    setCustomPt(pkg.pt_session_cnt)
    setCustomGroup(pkg.group_session_cnt)
    setCustomSelf(pkg.self_session_cnt)
    setCustomPrice(pkg.price)
    setShowPackagePopup(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md max-h-screen overflow-auto">
        <h2 className="flex justify-center items-center gap-2 text-xl font-semibold text-gray-800 mb-6 w-full">
          <UserRoundPen size={20} />
          회원 정보 수정
        </h2>

        {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}

        <div className="mb-4 space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">회원 기본 정보</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="이름을 입력하세요"
                className="text-sm text-gray-700 w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="mb-4 flex flex-col md:flex-row md:items-start md:gap-4">
              <div className="md:w-2/5">
                <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date || ''}
                  onChange={handleChange}
                  className="text-sm text-gray-700 w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="md:w-3/5 mt-4 md:mt-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">핸드폰 번호</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className="text-sm text-gray-700 w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-4 flex flex-col md:flex-row md:items-start md:gap-4">
              <div className="md:w-2/5">
                <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  className="text-sm text-gray-700 w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="F">여자</option>
                  <option value="M">남자</option>
                </select>
              </div>
              <div className="md:w-3/5 mt-4 md:mt-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">레벨</label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="text-sm text-gray-700 w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Level 1">Level 1</option>
                  <option value="Level 2">Level 2</option>
                  <option value="Level 3">Level 3</option>
                  <option value="Level 4">Level 4</option>
                  <option value="Level 5">Level 5</option>
                </select>
              </div>
              <div className="md:w-1/2 mt-4 md:mt-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">가입일</label>
                <input
                  type="date"
                  name="join_date"
                  value={formData.join_date || ''}
                  onChange={handleChange}
                  className="text-sm text-gray-700 w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">등록 패키지</h3>
            <div className="flex flex-wrap gap-2 mt-2 mb-4">
              <Button
                variant="outline"
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border-emerald-500 text-emerald-600 hover:bg-emerald-50 transition"
                onClick={openEditPackage}
              >
                수정
              </Button>

              <Button
                variant="outline"
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border-blue-500 text-blue-600 hover:bg-blue-50 transition"
                onClick={() => setShowPackagePopup(true)}
              >
                재등록
              </Button>

              <Button
                variant="outline"
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border-gray-400 text-gray-600 hover:bg-gray-50 transition"
                onClick={() => setShowPackageHistory((prev) => !prev)}
              >
                이전 패키지
              </Button>
            </div>

            
            {currentPackage ? (
              <div className="mb-4 p-4 rounded-xl shadow-sm border border-emerald-100 bg-white text-sm text-gray-700 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-base">
                  <PackageOpen size={18} />
                  현재 수강 중인 패키지
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">패키지명</span>
                    <div className="font-medium text-gray-800">{currentPackage.packages?.package_name ?? '패키지명 없음'}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">트레이너</span>
                    <div className="text-gray-800">{currentPackage.trainers?.name ?? '미지정'}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">수강 기간</span>
                    <div className="text-gray-800">
                      {currentPackage.start_date} <br></br> ~ <br></br>{currentPackage.end_date}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">가격</span>
                    <div className="text-gray-800">
                      {currentPackage.price?.toLocaleString() ?? '0'}원
                    </div>
                  </div>
                </div>
                <div className="mb-4 flex flex-col md:flex-row md:items-start md:gap-4">
                  <div className="md:w-1/3">
                    <span className="text-xs text-gray-500">PT 세션</span>
                    <div className="text-gray-800">{currentPackage.pt_session_cnt}회</div>
                  </div>
                  <div className="md:w-1/3">
                    <span className="text-xs text-gray-500">개인운동</span>
                    <div className="text-gray-800">{currentPackage.self_session_cnt}회</div>
                  </div>
                  <div className="md:w-1/3">
                    <span className="text-xs text-gray-500">그룹 세션</span>
                    <div className="text-gray-800">{currentPackage.group_session_cnt}회</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">현재 수강 중인 패키지가 없습니다.</p>
            )}

            {isEditPackageOpen && currentPackage && (
              <EditMemberPackage
                currentPackage={currentPackage}
                editPtSession={editPtSession}
                setEditPtSession={setEditPtSession}
                editSelfSession={editSelfSession}
                setEditSelfSession={setEditSelfSession}
                editGroupSession={editGroupSession}
                setEditGroupSession={setEditGroupSession}
                editTrainerId={editTrainerId}
                setEditTrainerId={setEditTrainerId}
                editStartDate={editStartDate}
                setEditStartDate={setEditStartDate}
                editEndDate={editEndDate}
                setEditEndDate={setEditEndDate}
                customPrice={customPrice}
                setCustomPrice={setCustomPrice}
                trainers={trainers}
                supabase={supabase}
                fetchMemberPackages={fetchMemberPackages}
                setIsOpen={setIsEditPackageOpen}
              />
            )}
      
            {showPackagePopup && (
              <ReRegisterMemberPackage
                open={showPackagePopup}
                onOpenChange={setShowPackagePopup}
                selectedPackage={selectedPackage}
                setSelectedPackage={setSelectedPackage}
                packages={packages}
                memberId={formData.member_id}
                trainers={trainers}
                supabase={supabase}
                showPackagePopup={showPackagePopup}
                setShowPackagePopup={setShowPackagePopup}
                fetchMemberPackages={fetchMemberPackages}
              />
            )}
            
            {showPackageHistory && (
              <BeforeMemberPackage
                open={showPackageHistory}
                onOpenChange={setShowPackageHistory}
                memberPackages={memberPackages}
                today={today}
              />
            )}
 
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            variant="outline"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition"
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