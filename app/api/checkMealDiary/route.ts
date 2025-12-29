// app/api/checkMealDiary/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Supabase Server Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ 반드시 Service Role
)

export async function POST() {
  try {
    const now = new Date()
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const today = kstNow.toISOString().split('T')[0]


    /* 1️⃣ 식단 관리 ON + 활성 회원 조회 */
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('member_id, name, phone')
      .eq('meal_enabled', true)
      .eq('status', 'active')

    if (memberError) {
      console.error('Member fetch error:', memberError)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ message: 'No meal-enabled members' })
    }

    /* 2️⃣ 오늘 식단 등록된 회원 조회 */
    const { data: diaries, error: diaryError } = await supabase
      .from('food_diaries')
      .select('member_id')
      .eq('date', today)

    if (diaryError) {
      console.error('Diary fetch error:', diaryError)
      return NextResponse.json({ error: 'Failed to fetch food diaries' }, { status: 500 })
    }

    const diaryMemberSet = new Set(
      (diaries ?? []).map(d => d.member_id)
    )

    /* 3️⃣ 오늘 식단 미등록 회원 필터링 */
    const targetMembers = members.filter(
      m => !diaryMemberSet.has(m.member_id)
    )

    if (targetMembers.length === 0) {
      return NextResponse.json({ message: 'All members submitted meals today 🎉' })
    }

    /* 4️⃣ 카카오 알림톡 전송 */
    const results: {
      member_id: number
      success: boolean
      error?: unknown
    }[] = []

    for (const member of targetMembers) {
      try {
        // 개발환경에서는 실제 발송 안 함
        if (process.env.NODE_ENV !== 'production') {
          console.log('[TEST MODE] Kakao skipped:', member.name)
          results.push({ member_id: member.member_id, success: true })
          continue
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/sendKakao`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: member.phone.startsWith('82')
                ? member.phone
                : `82${member.phone.replace(/^0/, '')}`,
              name: member.name,
              templateCode: 'MEAL_REMIND_01', // 🔥 알림톡 템플릿 코드
            }),
          }
        )

        if (!res.ok) {
          throw new Error(`Kakao API failed: ${res.status}`)
        }

        results.push({ member_id: member.member_id, success: true })
      } catch (err) {
        console.error('Kakao send error:', member.member_id, err)
        results.push({ member_id: member.member_id, success: false, error: err })
      }
    }

    return NextResponse.json({
      date: today,
      totalTargets: targetMembers.length,
      results,
    })
  } catch (err) {
    console.error('checkMealDiary fatal error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
