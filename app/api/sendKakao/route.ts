// app/api/sendKakao/route.ts
import { NextResponse } from 'next/server'
import https from 'https' 
import { serverEnv } from '@/lib/config'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {

  // console.log("NEXT_RUNTIME:", process.env.NEXT_RUNTIME);
  // console.log("process.env keys:", Object.keys(process.env).filter(k => k.includes("NHN")));

  // console.log("ALL ENV KEYS:", Object.keys(process.env));

  // console.log('NODE_ENV:', process.env.NODE_ENV);
  // console.log('NHN_APP_KEY exists?', !!process.env.NHN_APP_KEY);
  // console.log('Runtime:', process.env.NEXT_RUNTIME);

  const { NHN_SECRET_KEY, NHN_APP_KEY, NHN_SENDER_KEY } = serverEnv

  if (!NHN_SECRET_KEY || !NHN_APP_KEY || !NHN_SENDER_KEY) {
    console.error('환경변수 미설정:', { NHN_SECRET_KEY, NHN_APP_KEY, NHN_SENDER_KEY })
    return NextResponse.json({ error: 'Environment variables not set' }, { status: 500 })
  }

  const { phone, name, date, time, status, sessionType, templateCode } = await req.json()

  try {
    const data = JSON.stringify({
      senderKey: process.env.NHN_SENDER_KEY,
      templateCode,
      recipientList: [
        {
          recipientNo: phone,
          templateParameter: { name, date, time, status, sessionType },
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
        'Content-Length': Buffer.byteLength(data),
      },
      rejectUnauthorized: process.env.NODE_ENV !== 'development',
      // rejectUnauthorized: false,
    }

    const response = await new Promise((resolve, reject) => {
      const reqHttps = https.request(options, (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          console.log('Send Data:', data)
          console.log('NHN Response:', body) // 🔍 응답 로그 찍기
          console.log("Using templateCode:", templateCode)
          console.log('statusCode:', res.statusCode)
          resolve(JSON.parse(body))
        })
      })
      reqHttps.on('error', reject)
      reqHttps.write(data)
      reqHttps.end()
    })
      

    return NextResponse.json(response)
  } catch (err) {
    console.error('NHN Cloud API 호출 실패:', err)
    return NextResponse.json({ error: 'Failed to send KakaoTalk' }, { status: 500 })
  }
}
