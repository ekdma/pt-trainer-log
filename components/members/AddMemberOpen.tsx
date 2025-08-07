'use client'

import { UserRound, Plus, PackagePlus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import dayjs from 'dayjs'
import { endOfMonth, addMonths, format, parseISO } from 'date-fns';
import AddMemberPackage from '@/components/members/AddMemberPackage'
import { toast } from 'sonner'

interface Package {
  package_id: number
  package_name: string
  pt_session_cnt: number
  group_session_cnt: number
  self_session_cnt: number
  price: number
  valid_date: number
}

type Trainer = {
  trainer_id: number
  name: string
}

type Props = {
  onClose: () => void
  onMemberAdded: () => void
}

function formatPrice(value: string) {
  if (!value) return '';
  return Number(value).toLocaleString();
}

export default function AddMemberOpen({ onClose, onMemberAdded }: Props) {
  const supabase: SupabaseClient = getSupabaseClient()

  const [name, setName] = useState('')
  const [birthInput, setBirthInput] = useState('')
  const [sex, setSex] = useState('F') // ✅ default option
  const [level, setLevel] = useState('Level 1')
  const [joinDate, setJoinDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [customPt, setCustomPt] = useState(0)
  const [customGroup, setCustomGroup] = useState(0)
  const [customSelf, setCustomSelf] = useState(0)
  const [customPrice, setCustomPrice] = useState(0)
  const [startDate, setStartDate] = useState<string>(() => dayjs().format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState<string>(() => dayjs().add(1, 'month').format('YYYY-MM-DD'))

  const [isPackagePopupOpen, setIsPackagePopupOpen] = useState(false)
  const [packages, setPackages] = useState<Package[]>([])

  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(null)

  const [phone, setPhone] = useState('')
  const [nickname, setNickname] = useState('')

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
  
    const start = new Date();
    const formattedToday = format(start, 'yyyy-MM-dd');
    const calculatedEndDate = format(
      endOfMonth(addMonths(start, selectedPackage.valid_date)),
      'yyyy-MM-dd'
    );
    setStartDate(formattedToday);
    setEndDate(calculatedEndDate);
  }, [selectedPackage]);
  
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('valid_date, package_name, pt_session_cnt, self_session_cnt, group_session_cnt', { ascending: true }) // 오름차순 정렬
  
    if (!error) setPackages(data)
  }

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg)
    setCustomPt(pkg.pt_session_cnt)
    setCustomGroup(pkg.group_session_cnt)
    setCustomSelf(pkg.self_session_cnt)
    setCustomPrice(pkg.price)
    setIsPackagePopupOpen(false)
  }

  const handleSubmit = async () => {
    setErrorMsg('')

    if (!name.trim() || !birthInput.trim()) {
      setErrorMsg('이름과 생년월일을 입력하세요')
      return
    }

    // 생일 처리
    let birthDate: string
    if (/^\d{4}$/.test(birthInput)) birthDate = `${birthInput}-01-01`
    else if (/^\d{4}-\d{2}-\d{2}$/.test(birthInput)) birthDate = birthInput
    else if (/^\d{8}$/.test(birthInput))
      birthDate = `${birthInput.slice(0, 4)}-${birthInput.slice(4, 6)}-${birthInput.slice(6, 8)}`
    else {
      setErrorMsg('생일 형식이 올바르지 않아요')
      return
    }

    const rawPhone = phone.replace(/-/g, '')  // 하이픈 제거

    if (!/^010\d{8}$/.test(rawPhone)) {
      setErrorMsg('유효한 핸드폰 번호를 입력하세요 (예: 010-1234-5678)')
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('members')
      .insert([
        {
          name,
          nickname,
          phone: rawPhone,
          birth_date: birthDate,
          sex,
          level,
          before_level: level,
          join_date: joinDate,
        },
      ])
      .select('member_id')
      .single()

    if (error || !data) {
      setErrorMsg(error?.message || '회원 생성 실패')
      setLoading(false)
      return
    }

    const memberId = data.member_id

    // 선택된 패키지 있으면 member_packages에 insert
    if (selectedPackage) {
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
      ])

      if (pkgErr) {
        // alert('회원은 등록되었지만 패키지 등록에 실패했습니다')
        toast.error('회원은 등록되었지만 패키지 등록에 실패했습니다')
      }
    }

    setLoading(false)
    // alert('회원 등록이 완료되었습니다 😎')
    toast.success('회원 등록이 완료되었습니다 😎')
    onMemberAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md max-h-screen overflow-auto">
        <h2 className="flex justify-center items-center gap-2 text-xl font-semibold text-gray-800 mb-6 w-full">
          <UserRound size={20} />
          신규 회원 등록
        </h2>

        {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}

        <div className="mb-4 space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">회원 기본 정보</h3>

            <div className="flex gap-4 mb-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  className="text-sm text-gray-700 w-full p-2 border rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
                />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">닉네임</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임"
                  className="text-sm text-gray-700 w-full p-2 border rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-4 flex flex-col md:flex-row md:items-start md:gap-4">
              <div className="md:w-2/5">
                <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
                <input
                  type="text"
                  value={birthInput}
                  onChange={(e) => setBirthInput(e.target.value)}
                  placeholder="예: 19950703"
                  className="text-sm text-gray-700 w-full p-2 border rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
                />
                {/* <p className="text-xs text-gray-500 mt-1">
                  ※ 연도만 입력 시 '01-01'로 자동 처리됩니다
                </p> */}
              </div>
              <div className="md:w-3/5 mt-4 md:mt-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">핸드폰 번호</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => {
                    let input = e.target.value
                    // 숫자만 추출
                    input = input.replace(/\D/g, '')

                    // ###-####-#### 형태로 변환
                    if (input.length > 3 && input.length <= 7) {
                      input = `${input.slice(0, 3)}-${input.slice(3)}`
                    } else if (input.length > 7) {
                      input = `${input.slice(0, 3)}-${input.slice(3, 7)}-${input.slice(7, 11)}`
                    }

                    setPhone(input)
                  }}
                  placeholder="예: 010-1234-5678"
                  className="text-sm text-gray-700 w-full p-2 border rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
                  maxLength={13} // 하이픈 포함 최대길이 제한
                />
              </div>
            </div>

            <div className="mb-4 flex flex-col md:flex-row md:items-start md:gap-4">
              <div className="md:w-2/5">
                <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="text-sm text-gray-700 w-full p-2 border rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
                >
                  <option value="F">여자</option>
                  <option value="M">남자</option>
                </select>
              </div>
              <div className="md:w-3/5 mt-4 md:mt-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">레벨</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="text-sm text-gray-700 w-full p-2 border rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
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
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                  className="text-sm text-gray-700 w-full p-2 border rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">등록 패키지</h3>
              <Button
                variant="outline"
                className="text-sm px-3 py-1 flex items-center gap-1 border-emerald-500 text-emerald-600 border-dashed"
                onClick={() => {
                  setIsPackagePopupOpen(true)
                  fetchPackages()
                }}
              >
                <Plus size={16} />
                패키지 선택
              </Button>
            </div>
        
            {selectedPackage && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-100 shadow-sm space-y-3 text-sm text-gray-700">
                <div className="font-semibold text-base text-emerald-700 flex items-center gap-2">
                  <PackagePlus size={18} /> 
                  {selectedPackage.package_name} {selectedPackage.valid_date}달 
                </div>
                <div className="mb-4 flex flex-col md:flex-row md:items-start md:gap-4">
                  <div className="md:w-1/3">
                    <label className="text-xs text-gray-500">PT 세션</label>
                    <input
                      type="text"
                      value={customPt}
                      onChange={e => setCustomPt(Number(e.target.value))}
                      className="w-full border rounded px-2 py-1 text-center"
                    />
                  </div>
                  <div className="md:w-1/3">
                    <label className="text-xs text-gray-500">개인운동</label>
                    <input
                      type="text"
                      value={customSelf}
                      onChange={e => setCustomSelf(Number(e.target.value))}
                      className="w-full border rounded px-2 py-1 text-center"
                    />
                  </div>
                  <div className="md:w-1/3">
                    <label className="text-xs text-gray-500">그룹 세션</label>
                    <input
                      type="text"
                      value={customGroup}
                      onChange={e => setCustomGroup(Number(e.target.value))}
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
                      onChange={e => {
                        setCustomPrice(Number(e.target.value))
                      }}
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
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setStartDate(newStart);

                        if (selectedPackage?.valid_date) {
                          const calculatedEndDate = format(
                            endOfMonth(addMonths(parseISO(newStart), selectedPackage.valid_date)),
                            'yyyy-MM-dd'
                          );
                          setEndDate(calculatedEndDate);
                        }
                      }}
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
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          {/* <Button
            onClick={handleSubmit}
            disabled={loading}
            variant="outline"
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition"
          >
            {loading ? '등록 중...' : '등록'}
          </Button>
          <Button
            onClick={onClose}
            disabled={loading}
            variant="outline"
            type="button"
            className="px-4 py-2 text-sm"
          >
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
        </div>

        {isPackagePopupOpen && (
          <AddMemberPackage
            open={isPackagePopupOpen}
            onOpenChange={setIsPackagePopupOpen}
            packages={packages}
            onSelect={(pkg) => {
              handlePackageSelect(pkg)
              setIsPackagePopupOpen(false)
            }}
          />
        )}
  

      </div>
    </div>
  )
}
