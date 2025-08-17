// app/api/sendKakao/route.ts
import { NextResponse } from 'next/server'
import https from 'https' 

export async function POST(req: Request) {
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

    const secretKey = process.env.NHN_SECRET_KEY;
    if (!secretKey) {
      console.error('NHN_SECRET_KEY 환경변수가 설정되지 않았습니다.');
      return NextResponse.json({ error: 'NHN_SECRET_KEY not set' }, { status: 500 });
    }

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
