'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { useLanguage } from '@/context/LanguageContext'

interface BeforeAfterPhotosProps {
  memberId: string
}

export default function BeforeAfterPhotos({ memberId }: BeforeAfterPhotosProps) {
  useAuthGuard()
  const { t } = useLanguage()
  const supabase = getSupabaseClient()

  const { user } = useAuth()
  const userRole = user?.role
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null)
  const [afterUrl, setAfterUrl] = useState<string | null>(null)
  const [afterExtraUrls, setAfterExtraUrls] = useState<(string | null)[]>([]) // attribute3~10

  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef = useRef<HTMLInputElement>(null)
  const afterExtraInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [recordId, setRecordId] = useState<number | null>(null)

  const [afterExtraVisibility, setAfterExtraVisibility] = useState<boolean[]>([])

  const [beforeVisible, setBeforeVisible] = useState(true)
  const [afterVisible, setAfterVisible] = useState(true)
  const [photoDates, setPhotoDates] = useState<(string | null)[]>([]) // ISO Date string

  // 최대 8개 추가 가능
  const MAX_EXTRA = 8

  // storage path 추출 함수 (기존 동일)
  const extractStoragePath = (url: string) => {
    try {
      const u = new URL(url)
      const parts = u.pathname.split('/')
      const photosIndex = parts.findIndex((p) => p === 'photos')
      if (photosIndex >= 0) {
        return parts.slice(photosIndex + 1).join('/')
      }
    } catch {
      return null
    }
    return null
  }

  // DB에서 기존 사진 불러오기 + attribute3~10까지 읽어오기
  useEffect(() => {
    if (!memberId) return

    setBeforeUrl(null)
    setAfterUrl(null)
    setAfterExtraUrls([])
    setRecordId(null)

    const fetchBeforeAfter = async () => {
      const { data, error } = await supabase
        .from('before_after')
        .select(
          'id, attribute1, attribute2, attribute3, attribute4, attribute5, attribute6, attribute7, attribute8, attribute9, attribute10, attribute1_date,  attribute2_date,  attribute3_date,  attribute4_date,  attribute5_date,  attribute6_date,  attribute7_date,  attribute8_date,  attribute9_date,  attribute10_date'
        )
        .eq('member_id', memberId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('before_after 조회 실패:', error.message)
        return
      }

      if (data) {
        setRecordId(data.id)
        setBeforeUrl(data.attribute1)
        setAfterUrl(data.attribute2)
        // attribute3~10 배열로 세팅 (null값도 포함)
        
        const extras = [
          data.attribute3,
          data.attribute4,
          data.attribute5,
          data.attribute6,
          data.attribute7,
          data.attribute8,
          data.attribute9,
          data.attribute10,
        ].map((v) => v || null)
        // 가장 마지막 null이 아닌 항목까지만 유지
        const lastIndex = extras.map((v) => v !== null).lastIndexOf(true)
        const trimmedExtras = lastIndex >= 0 ? extras.slice(0, lastIndex + 1) : []

        setAfterExtraUrls(trimmedExtras)
        setAfterExtraVisibility(trimmedExtras.map(() => true))

        const dates = [
          data.attribute1_date,
          data.attribute2_date,
          data.attribute3_date,
          data.attribute4_date,
          data.attribute5_date,
          data.attribute6_date,
          data.attribute7_date,
          data.attribute8_date,
          data.attribute9_date,
          data.attribute10_date,
        ]
        setPhotoDates(dates)
      } else {
        setAfterExtraUrls([])
        setAfterExtraVisibility([])
      }
    }

    fetchBeforeAfter()
  }, [memberId])

  const handleDateChange = async (newDate: string, type: 'before' | 'after' | 'afterExtra', index?: number) => {
    let column = ''
    if (type === 'before') column = 'attribute1_date'
    else if (type === 'after') column = 'attribute2_date'
    else if (type === 'afterExtra' && index !== undefined) column = `attribute${3 + index}_date`
  
    if (!column || !recordId) return
  
    const { error } = await supabase
      .from('before_after')
      .update({ [column]: newDate })
      .eq('id', recordId)
  
    if (!error) {
      setPhotoDates((prev) => {
        const newDates = [...prev]
        if (type === 'before') newDates[0] = newDate
        else if (type === 'after') newDates[1] = newDate
        else if (index !== undefined) newDates[2 + index] = newDate
        return newDates
      })
    }
  }

  // 공통 업로드 함수, type은 'before' | 'after' | 'afterExtra', index는 afterExtra 배열 인덱스
  const uploadPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'before' | 'after' | 'afterExtra',
    index?: number
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
  
    let oldUrl: string | null = null
    let columnName = ''
  
    if (type === 'before') {
      oldUrl = beforeUrl
      columnName = 'attribute1'
    } else if (type === 'after') {
      oldUrl = afterUrl
      columnName = 'attribute2'
    } else if (type === 'afterExtra' && index !== undefined) {
      oldUrl = afterExtraUrls[index]
      columnName = `attribute${3 + index}` // attribute3부터 시작
    }
  
    if (oldUrl) {
      const oldPath = extractStoragePath(oldUrl)
      if (oldPath) {
        const { error: deleteError } = await supabase.storage.from('photos').remove([oldPath])
        if (deleteError) {
          console.warn('기존 사진 삭제 실패:', deleteError.message)
        }
      }
    }
  
    const timestamp = Date.now()
    const ext = file.name.split('.').pop() || 'jpg'
    let filePath = `public/beforeafter/${memberId}_${type}_${timestamp}.${ext}`
    if (type === 'afterExtra' && index !== undefined) {
      filePath = `public/beforeafter/${memberId}_${type}${index + 2}_${timestamp}.${ext}`
    }
  
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, file, { cacheControl: '3600', upsert: true })
  
    if (uploadError) {
      toast.error('업로드 실패: ' + uploadError.message)
      // alert('업로드 실패: ' + uploadError.message)
      return
    }
  
    const { data: { publicUrl } = {} } = supabase.storage.from('photos').getPublicUrl(filePath)
    if (!publicUrl) {
      toast.error('사진 URL을 가져오지 못했습니다.')
      // alert('사진 URL을 가져오지 못했습니다.')
      return
    }
  
    const todayISO = new Date().toISOString().split('T')[0] // "YYYY-MM-DD"
    const dateColumnName = columnName + '_date'
  
    if (recordId) {
      const { error: updateError } = await supabase
        .from('before_after')
        .update({ [columnName]: publicUrl, [dateColumnName]: todayISO })
        .eq('id', recordId)
  
      if (updateError) {
        toast.error('DB 업데이트 실패: ' + updateError.message)
        // alert('DB 업데이트 실패: ' + updateError.message)
        return
      }
    } else {
      const { data: insertData, error: insertError } = await supabase
        .from('before_after')
        .insert([{ member_id: memberId, [columnName]: publicUrl, [dateColumnName]: todayISO }])
        .select()
        .single()
  
      if (insertError) {
        toast.error('DB 저장 실패: ' + insertError.message)
        // alert('DB 저장 실패: ' + insertError.message)
        return
      }
      setRecordId(insertData.id)
    }
  
    // 상태 업데이트
    if (type === 'before') setBeforeUrl(publicUrl)
    else if (type === 'after') setAfterUrl(publicUrl)
    else if (type === 'afterExtra' && index !== undefined) {
      setAfterExtraUrls((prev) => {
        const newUrls = [...prev]
        newUrls[index] = publicUrl
        return newUrls
      })
    }
  }

  // // + 버튼 클릭 시 afterExtraUrls 배열에 빈 값 하나 추가 (최대 MAX_EXTRA)
  // const addAfterExtra = () => {
  //   if (afterExtraUrls.length >= MAX_EXTRA) return
  //   setAfterExtraUrls((prev) => [...prev, null])
  //   setAfterExtraVisibility((prev) => [...prev, true])
  // }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg space-y-8">
      <h2 className="text-2xl font-bold">{t('beforeafter.title')}</h2>

      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-fit">
          {/* Before */}
          {beforeVisible ? (
            <div className="flex flex-col items-center p-2 border rounded-lg bg-gray-50 min-w-[420px]">
              <p className="text-sm font-medium mb-1">Before</p>
              {beforeUrl ? (
                <>
                  <Image src={beforeUrl} alt="Before" width={800} height={900} className="rounded-md" unoptimized />
                  <input
                    type="date"
                    className="text-sm mt-2 px-2 py-1 border rounded bg-white text-gray-700"
                    value={photoDates[0] || ''}
                    onChange={(e) => handleDateChange(e.target.value, 'before')}
                  />
                  <div className="flex gap-2 mt-2">
                    {userRole === 'trainer' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-white text-gray-700 hover:bg-gray-300"
                          onClick={() => beforeInputRef.current?.click()}
                        >
                          {t('beforeafter.reupload')}
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-white text-gray-700 hover:bg-gray-300"
                      onClick={() => setBeforeVisible(false)}
                    >
                      {t('beforeafter.hide')}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {userRole === 'trainer' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-white text-gray-700 hover:bg-gray-300"
                      onClick={() => beforeInputRef.current?.click()}
                    >
                      {t('beforeafter.upload')}
                    </Button>
                  )}
                </>
              )}
              <input
                ref={beforeInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => uploadPhoto(e, 'before')}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-2 border rounded-lg bg-gray-100 text-gray-500 min-w-[50px] max-w-[100px]">
              <p className="text-sm">Before</p>
              <p className="text-xs"><EyeOff size={15} /></p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 bg-white text-gray-700 hover:bg-gray-300"
                onClick={() => setBeforeVisible(true)}
              >
                <Eye size={18} />
              </Button>
            </div>
          )}

          {/* After */}
          {afterVisible ? (
            <div className="flex flex-col items-center p-2 border rounded-lg bg-gray-50 min-w-[420px]">
              <p className="text-sm font-medium mb-1">After</p>
              {afterUrl ? (
                <>
                  <Image src={afterUrl} alt="After" width={800} height={900} className="rounded-md" unoptimized />
                  <input
                    type="date"
                    className="text-sm mt-2 px-2 py-1 border rounded bg-white text-gray-700"
                    value={photoDates[1] || ''}
                    onChange={(e) => handleDateChange(e.target.value, 'after')}
                  />
                  <div className="flex gap-2 mt-2">
                    {userRole === 'trainer' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-white text-gray-700 hover:bg-gray-300"
                          onClick={() => afterInputRef.current?.click()}
                        >
                          {t('beforeafter.reupload')}
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-white text-gray-700 hover:bg-gray-300"
                      onClick={() => setAfterVisible(false)}
                    >
                      {t('beforeafter.hide')}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {userRole === 'trainer' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-white text-gray-700 hover:bg-gray-300"
                      onClick={() => afterInputRef.current?.click()}
                    >
                      {t('beforeafter.upload')}
                    </Button>
                  )}
                </>
              )}
              <input
                ref={afterInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => uploadPhoto(e, 'after')}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-2 border rounded-lg bg-gray-100 text-gray-500 min-w-[50px] max-w-[100px]">
              <p className="text-sm">After</p>
              <p className="text-xs"><EyeOff size={15} /></p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 bg-white text-gray-700 hover:bg-gray-300"
                onClick={() => setAfterVisible(true)}
              >
                <Eye size={18} />
              </Button>
            </div>
          )}


          {/* 추가 After 사진들 */}
          {afterExtraUrls.map((url, idx) =>
            afterExtraVisibility[idx] ? (
              <div key={idx} className="flex flex-col items-center p-2 border rounded-lg bg-gray-50 min-w-[420px]">
                <p className="text-sm font-medium mb-1">After {idx + 2}</p>
                {url ? (
                  <>
                    <Image
                      src={url}
                      alt={`After ${idx + 2}`}
                      width={800}
                      height={900}
                      className="rounded-md"
                      unoptimized
                    />
                    <input
                      type="date"
                      className="text-sm mt-2 px-2 py-1 border rounded bg-white text-gray-700"
                      value={photoDates[2 + idx] || ''}
                      onChange={(e) => handleDateChange(e.target.value, 'afterExtra', idx)}
                    />

                    <div className="flex gap-2 mt-2">
                      {userRole === 'trainer' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="bg-white text-gray-700 hover:bg-gray-300"
                            onClick={() => afterExtraInputRefs.current[idx]?.click()}
                          >
                            {t('beforeafter.reupload')}
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="bg-white text-gray-700 hover:bg-gray-300"
                        onClick={() => {
                          setAfterExtraVisibility((prev) => {
                            const newVis = [...prev]
                            newVis[idx] = false
                            return newVis
                          })
                        }}
                      >
                        {t('beforeafter.hide')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {userRole === 'trainer' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="bg-white text-gray-700 hover:bg-gray-300"
                        onClick={() => afterExtraInputRefs.current[idx]?.click()}
                      >
                        {t('beforeafter.upload')}
                      </Button>
                    )}
                  </>
                )}
                <input
                  ref={(el) => {
                    afterExtraInputRefs.current[idx] = el
                  }}
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadPhoto(e, 'afterExtra', idx)}
                  className="hidden"
                />
              </div>
            ) : (
              <div
                key={idx}
                className="flex flex-col items-center justify-center p-2 border rounded-lg bg-gray-100 text-gray-500 min-w-[50px] max-w-[100px]"
              >
                <p className="mb-1 text-sm text-center">After {idx + 2}</p>
                <p className="text-xs text-center"><EyeOff size={15} /></p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 bg-white text-gray-700 hover:bg-gray-300"
                  onClick={() => {
                    setAfterExtraVisibility((prev) => {
                      const newVis = [...prev]
                      newVis[idx] = true
                      return newVis
                    })
                  }}
                >
                  <Eye size={18} />
                </Button>
              </div>
            )
          )}
        </div>
      </div>

      {/* + 추가 버튼 */}
      {userRole === 'trainer' && (
        <>
        {afterExtraUrls.length < MAX_EXTRA && (
          <div className="mt-4">
            <Button
              variant="ghost"
              className="font-semibold bg-white border border-transparent text-gray-700 hover:bg-gray-300 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
              onClick={() => {
                setAfterExtraUrls((prev) => [...prev, null])
                setAfterExtraVisibility((prev) => [...prev, true])
              }}
            >
              + {t('beforeafter.addphoto')}
            </Button>
          </div>
        )}
        </>
      )}
    </div>


  )
}
