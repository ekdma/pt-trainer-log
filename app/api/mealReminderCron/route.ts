import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import https from 'https'

export async function GET() {
  console.log('🔥 Cron triggered')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1️⃣ 식단 리마인드 ON 회원 조회
    const { data: members, error } = await supabase
      .from('members')
      .select('member_id, name, phone')
      .eq('meal_enabled', true)

    if (error) {
      console.error('❌ Supabase fetch error:', error)
      return NextResponse.json({ error })
    }

    if (!members || members.length === 0) {
      console.log('ℹ️ No members to send')
      return NextResponse.json({ ok: true })
    }

    console.log(`📌 Sending to ${members.length} members`)

    for (const member of members) {
      if (!member.phone) continue

      const phone = member.phone.startsWith('82')
        ? member.phone
        : `82${member.phone.replace(/^0/, '')}`

      const body = JSON.stringify({
        senderKey: process.env.NHN_SENDER_KEY,
        templateCode: 'MEAL_REMIND_01',
        recipientList: [
          {
            recipientNo: phone,
            templateParameter: {
              name: member.name,
            },
          },
        ],
      })

      const options = {
        hostname: 'api-alimtalk.cloud.toast.com',
        path: `/alimtalk/v2.3/appkeys/${process.env.NHN_APP_KEY}/messages`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-Secret-Key': process.env.NHN_SECRET_KEY!,
          'Content-Length': Buffer.byteLength(body),
        },
      }

      await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let responseData = ''

          res.on('data', (chunk) => {
            responseData += chunk
          })

          res.on('end', () => {
            console.log('📨 NHN response:', responseData)
            resolve(null)
          })
        })

        req.on('error', (err) => {
          console.error('❌ NHN request error:', err)
          reject(err)
        })

        req.write(body)
        req.end()
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('🔥 Cron crash:', err)
    return NextResponse.json({ error: 'Internal error' })
  }
}