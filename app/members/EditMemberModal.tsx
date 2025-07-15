'use client'

import { UserRoundPen, PackagePlus, PackageMinus, PackageOpen } from 'lucide-react'
import { useState, useEffect } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { Member, MemberPackage, Package, Trainer } from './types'
import { Button } from '@/components/ui/button'
import dayjs from 'dayjs'

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
  const [customPrice, setCustomPrice] = useState(0)
  const [startDate, setStartDate] = useState<string>(() => dayjs().format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState<string>(() => dayjs().add(1, 'month').format('YYYY-MM-DD'))

  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(null)

  const [isEditPackageOpen, setIsEditPackageOpen] = useState(false)

  // 수정용 상태 (초기값은 currentPackage 값으로 세팅)
  const [editPtSession, setEditPtSession] = useState(0)
  const [editGroupSession, setEditGroupSession] = useState(0)
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
      .order('valid_date, package_name, pt_session_cnt, group_session_cnt', { ascending: true }) 
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
    setEditTrainerId(currentPackage.trainer_id ?? null);
    setCustomPrice(currentPackage.price ?? 0);  // 여기서 기존 가격 세팅
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
                {showPackageHistory ? '이전 패키지 닫기' : '이전 패키지 보기'}
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
                  <div>
                    <span className="text-xs text-gray-500">PT 세션</span>
                    <div className="text-gray-800">{currentPackage.pt_session_cnt}회</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">그룹 세션</span>
                    <div className="text-gray-800">{currentPackage.group_session_cnt}회</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">현재 수강 중인 패키지가 없습니다.</p>
            )}

            {isEditPackageOpen && currentPackage && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md max-h-screen overflow-auto">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 items-center gap-2">
                    {currentPackage.packages?.package_name}
                  </h3>
            
                  <div className="mt-4 p-4 border rounded-lg bg-gray-50 shadow-sm space-y-3 text-sm text-gray-700">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">PT 세션</label>
                        <input
                          type="number"
                          min={0}
                          value={editPtSession}
                          onChange={e => setEditPtSession(Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">그룹 세션</label>
                        <input
                          type="number"
                          min={0}
                          value={editGroupSession}
                          onChange={e => setEditGroupSession(Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">가격 (원)</label>
                        <input
                          type="number"
                          min={0}
                          value={customPrice}  // 가격 상태는 아마 별도라면 그대로 쓰고, 없으면 editPrice 추가 필요
                          onChange={e => setCustomPrice(Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">트레이너</label>
                        <select
                          value={editTrainerId ?? ''}
                          onChange={e => setEditTrainerId(Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-center"
                        >
                          <option value="" disabled>선택</option>
                          {trainers.map(trainer => (
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
                          onChange={e => setEditStartDate(e.target.value)}
                          className="w-full border rounded px-2 py-1 text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">종료일</label>
                        <input
                          type="date"
                          value={editEndDate}
                          onChange={e => setEditEndDate(e.target.value)}
                          className="w-full border rounded px-2 py-1 text-center"
                        />
                      </div>
                    </div>
                  </div>
            
                  <div className="mt-6 flex justify-end gap-3">
                    <Button
                      variant="outline"
                      className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={async () => {
                        setLoading(true)
                        const { error } = await supabase
                          .from('member_packages')
                          .update({
                            start_date: editStartDate,
                            end_date: editEndDate,
                            pt_session_cnt: editPtSession,
                            group_session_cnt: editGroupSession,
                            trainer_id: editTrainerId,
                            price: customPrice,
                          })
                          .eq('member_package_id', currentPackage.member_package_id)
                        setLoading(false)
                        if (error) {
                          alert('패키지 수정 실패: ' + error.message)
                        } else {
                          alert('패키지 정보가 수정되었습니다.')
                          setIsEditPackageOpen(false)
                          fetchMemberPackages()
                        }
                      }}
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
                </div>
              </div>
            )}
      
            {selectedPackage && (
              <div className="mt-4 p-4 border rounded-lg bg-emerald-50 shadow-sm space-y-3 text-sm text-gray-700">
                <div className="font-semibold text-base text-emerald-700 flex items-center gap-2">
                  <PackagePlus size={18} /> 재등록 패키지 - {selectedPackage.package_name} {selectedPackage.valid_date}달 
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">PT 세션</label>
                    <input
                      type="text"
                      value={customPt}
                      onChange={e => setCustomPt(Number(e.target.value))}
                      className="w-full border rounded px-2 py-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">그룹 세션</label>
                    <input
                      type="text"
                      value={customGroup}
                      onChange={e => setCustomGroup(Number(e.target.value))}
                      className="w-full border rounded px-2 py-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">가격 (원)</label>
                    <input
                      type="text"
                      value={customPrice}
                      onChange={e => setCustomPrice(Number(e.target.value))}
                      className="w-full border rounded px-2 py-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">트레이너</label>
                    <select
                      value={selectedTrainerId ?? ''}
                      onChange={(e) => setSelectedTrainerId(Number(e.target.value))}
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
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">종료일</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            
            {showPackageHistory && (
              <div className="mt-4 text-sm space-y-4">
                <h4 className="font-semibold text-gray-700">이전 패키지</h4>

                {memberPackages
                  .filter((p) => p.end_date < today || p.status === 'closed')
                  .map((pkg) => (
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
                          <div className="text-gray-800">
                            {pkg.price?.toLocaleString() ?? '0'}원
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">PT 세션</span>
                          <div className="text-gray-800">{pkg.pt_session_cnt}회</div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">그룹 세션</span>
                          <div className="text-gray-800">{pkg.group_session_cnt}회</div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
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

        {showPackagePopup && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white w-[360px] max-h-[500px] overflow-y-auto p-5 rounded-xl shadow-xl border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">재등록할 패키지를 선택하세요</h3>

              <div className="space-y-3">
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
                      PT: {pkg.pt_session_cnt} / 그룹: {pkg.group_session_cnt}
                    </div>
                    <div className="mt-1 text-sm text-gray-700">
                      가격: <span className="text-rose-600 font-semibold">{pkg.price.toLocaleString()}원</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-right mt-5">
                <Button size="sm" variant="outline" className="px-4 py-2 text-sm" onClick={() => setShowPackagePopup(false)}>
                  닫기
                </Button>
              </div>
            </div>
          </div>
        )}  
      </div>
    </div>
  )
}
