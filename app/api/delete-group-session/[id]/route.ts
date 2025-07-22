import { serverSupabase } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const groupSessionId = Number(params.id)

  if (isNaN(groupSessionId)) {
    return NextResponse.json({ message: '유효하지 않은 세션 ID입니다' }, { status: 400 })
  }

  try {
    const { error: error1 } = await serverSupabase
      .from('group_session_workouts')
      .delete()
      .eq('group_session_id', groupSessionId)

    if (error1) {
      console.error('group_session_workouts 삭제 실패:', error1.message)
      return NextResponse.json({ message: error1.message }, { status: 500 })
    }

    const { error: error2 } = await serverSupabase
      .from('group_session_participants')
      .delete()
      .eq('group_session_id', groupSessionId)

    if (error2) {
      console.error('group_session_participants 삭제 실패:', error2.message)
      return NextResponse.json({ message: error2.message }, { status: 500 })
    }

    const { error: error3 } = await serverSupabase
      .from('group_sessions')
      .delete()
      .eq('group_session_id', groupSessionId)

    if (error3) {
      console.error('group_sessions 삭제 실패:', error3.message)
      return NextResponse.json({ message: error3.message }, { status: 500 })
    }

    return NextResponse.json({ message: '삭제 성공' }, { status: 200 })
  } catch (err) {
    console.error('삭제 중 서버 오류:', err)
    return NextResponse.json({ message: '서버 오류 발생' }, { status: 500 })
  }
}

