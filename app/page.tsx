import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <h1 className="text-4xl font-bold mb-6 text-center text-indigo-300">PT Trainer Log</h1>
      <p className="text-lg text-gray-600 mb-8 text-center">
        회원의 운동 데이터를 기록하고 시각화하여 건강한 피트니스 라이프를 돕는 시스템입니다🙌
      </p>
      <Link
        href="/members"
        className="bg-transparent text-indigo-600 border border-indigo-600 px-5 py-2 rounded-xl hover:bg-indigo-100 transition duration-300"
      >
        회원 데이터 보기 →
      </Link>
    </main>
  )
}