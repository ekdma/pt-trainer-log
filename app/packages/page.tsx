'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import PackageSearch from './PackageSearch'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

interface Package {
  package_id: number
  package_name: string
  pt_session_cnt: number
  group_session_cnt: number
  valid_date: number
  price: number
  created_at: string
}

export default function PackageListPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const supabase = getSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    const checkRole = () => {
      try {
        const raw = localStorage.getItem('litpt_member')
        const member = raw ? JSON.parse(raw) : null
  
        if (!member || member.role !== 'trainer') {
          router.replace('/not-authorized')
        }
      } catch (e) {
        router.replace('/not-authorized')
      }
    }
  
    checkRole()
  }, [router])

  useEffect(() => {
    const fetchPackages = async () => {
      const { data, error } = await supabase.from('packages').select('*')
      if (error) {
        console.error('패키지 불러오기 실패:', error.message)
      } else {
        setPackages(data ?? [])
      }
    }

    fetchPackages()
  }, [])

  return (
    <main className="flex min-h-screen flex-col p-6 bg-gray-50 overflow-auto">
      <div className="p-4 w-full max-w-screen-2xl mx-auto">
        <PackageSearch
        />
      </div>
    </main>
  )
}
