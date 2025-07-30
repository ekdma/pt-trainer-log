'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

interface BeforeAfterPhotosProps {
  memberId: string
}

export default function BeforeAfterPhotos({ memberId }: BeforeAfterPhotosProps) {
  const supabase = getSupabaseClient()

  const [beforeUrl, setBeforeUrl] = useState<string | null>(null)
  const [afterUrl, setAfterUrl] = useState<string | null>(null)
  const [afterExtraUrls, setAfterExtraUrls] = useState<(string | null)[]>([]) // attribute3~10

  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef = useRef<HTMLInputElement>(null)
  const afterExtraInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [recordId, setRecordId] = useState<number | null>(null)

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
          'id, attribute1, attribute2, attribute3, attribute4, attribute5, attribute6, attribute7, attribute8, attribute9, attribute10'
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
        setAfterExtraUrls(
          [
            data.attribute3,
            data.attribute4,
            data.attribute5,
            data.attribute6,
            data.attribute7,
            data.attribute8,
            data.attribute9,
            data.attribute10,
          ].map((v) => v || null)
        )
      }
    }

    fetchBeforeAfter()
  }, [memberId])

  // 공통 업로드 함수, type은 'before' | 'after' | 'afterExtra', index는 afterExtra 배열 인덱스
  const uploadPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'before' | 'after' | 'afterExtra',
    index?: number
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 기존 사진 삭제
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
    // 경로에 타입과 index 반영 (afterExtra 인덱스가 있다면 파일명에 추가)
    let filePath = `public/beforeafter/${memberId}_${type}_${timestamp}.${ext}`
    if (type === 'afterExtra' && index !== undefined) {
      filePath = `public/beforeafter/${memberId}_${type}${index + 2}_${timestamp}.${ext}` // after2 부터 시작하니까 +2
    }

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, file, { cacheControl: '3600', upsert: true })

    if (uploadError) {
      alert('업로드 실패: ' + uploadError.message)
      return
    }

    const { data: { publicUrl } = {} } = supabase.storage.from('photos').getPublicUrl(filePath)
    if (!publicUrl) {
      alert('사진 URL을 가져오지 못했습니다.')
      return
    }

    if (recordId) {
      const { error: updateError } = await supabase
        .from('before_after')
        .update({ [columnName]: publicUrl })
        .eq('id', recordId)
      if (updateError) {
        alert('DB 업데이트 실패: ' + updateError.message)
        return
      }
    } else {
      const { data: insertData, error: insertError } = await supabase
        .from('before_after')
        .insert([{ member_id: memberId, [columnName]: publicUrl }])
        .select()
        .single()
      if (insertError) {
        alert('DB 저장 실패: ' + insertError.message)
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

  // + 버튼 클릭 시 afterExtraUrls 배열에 빈 값 하나 추가 (최대 MAX_EXTRA)
  const addAfterExtra = () => {
    if (afterExtraUrls.length >= MAX_EXTRA) return
    setAfterExtraUrls((prev) => [...prev, null])
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg space-y-8">
      <h2 className="text-2xl font-bold">Before / After 비교</h2>

      {/* Before / After 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Before */}
        <div className="p-4 border rounded-xl bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Before</h3>
          <div className="flex flex-col items-center">
            {beforeUrl ? (
              <>
                <Image src={beforeUrl} alt="Before" width={300} height={400} className="rounded-md" unoptimized />
                <Button 
                  // variant="darkGray" 
                  // className="text-sm mt-4" 
                  variant="ghost"
                  className="font-semibold bg-white border border-transparent text-gray-700 hover:bg-gray-300 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
                  onClick={() => beforeInputRef.current?.click()}
                >
                  사진 재업로드
                </Button>
              </>
            ) : (
              <Button 
                // variant="darkGray" 
                // className="text-sm" 
                variant="ghost"
                className="font-semibold bg-white border border-transparent text-gray-700 hover:bg-gray-300 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
                onClick={() => beforeInputRef.current?.click()}
              >
                Before 사진 업로드
              </Button>
            )}
            <input
              ref={beforeInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => uploadPhoto(e, 'before')}
              className="hidden"
            />
          </div>
        </div>

        {/* After */}
        <div className="p-4 border rounded-xl bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">After</h3>
          <div className="flex flex-col items-center">
            {afterUrl ? (
              <>
                <Image src={afterUrl} alt="After" width={300} height={400} className="rounded-md" unoptimized />
                <Button 
                  // variant="darkGray" 
                  // className="text-sm mt-4" 
                  variant="ghost"
                  className="font-semibold bg-white border border-transparent text-gray-700 hover:bg-gray-300 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
                  onClick={() => afterInputRef.current?.click()}
                >
                  사진 재업로드
                </Button>
              </>
            ) : (
              <Button 
                // className="text-sm" 
                // variant="darkGray" 
                variant="ghost"
                className="font-semibold bg-white border border-transparent text-gray-700 hover:bg-gray-300 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
                onClick={() => afterInputRef.current?.click()}
              >
                After 사진 업로드
              </Button>
            )}
            <input
              ref={afterInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => uploadPhoto(e, 'after')}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* 추가 After 사진들 */}
      <div>
        <h3 className="text-lg font-semibold mb-4"> + 추가 After 사진</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {afterExtraUrls.map((url, idx) => (
            <div key={idx} className="p-4 border rounded-xl bg-gray-50 flex flex-col items-center">
              <p className="mb-2 font-medium text-sm">After {idx + 2}</p>
              {url ? (
                <>
                  <Image
                    src={url}
                    alt={`After ${idx + 2}`}
                    width={200}
                    height={300}
                    className="rounded-md"
                    unoptimized
                  />
                  <Button 
                    // variant="darkGray" 
                    // className="text-sm  mt-3" 
                    variant="ghost"
                    className="font-semibold bg-white border border-transparent text-gray-700 hover:bg-gray-300 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
                    size="sm" 
                    onClick={() => afterExtraInputRefs.current[idx]?.click()}>
                    재업로드
                  </Button>
                </>
              ) : (
                <Button 
                  // variant="darkGray" 
                  // className="text-sm" 
                  variant="ghost"
                  className="font-semibold bg-white border border-transparent text-gray-700 hover:bg-gray-300 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
                  size="sm" 
                  onClick={() => afterExtraInputRefs.current[idx]?.click()}
                >
                  사진 업로드
                </Button>
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
          ))}
        </div>

        {afterExtraUrls.length < MAX_EXTRA && (
          <div className="mt-4">
            <Button 
              // className="text-sm" 
              // variant="lightGray" 
              variant="ghost"
              className="font-semibold bg-white border border-transparent text-gray-700 hover:bg-gray-300 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm"
              onClick={addAfterExtra}
            >
              + 추가 After 사진 추가
            </Button>
          </div>
        )}
      </div>
    </div>

  )
}
