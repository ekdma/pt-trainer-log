'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { SupabaseClient } from '@supabase/supabase-js'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Utensils } from 'lucide-react'
import { toast } from 'sonner'

interface MealToggleProps {
  memberId: number
  mealEnabled: boolean
  onRefresh?: () => void
}

export default function MealToggle({
  memberId,
  mealEnabled,
  onRefresh,
}: MealToggleProps) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    setSupabase(getSupabaseClient())
  }, [])

  const handleToggle = async (value: string) => {
    if (!value || !supabase) return

    const enabled = value === 'on'

    // 🔹 ON → 자동 리마인드 활성화
    // 🔹 OFF → 자동 리마인드 비활성화
    const { error } = await supabase
      .from('members')
      .update({
        meal_enabled: enabled,
        // meal_remind_enabled: enabled, // ✅ cron용 상태
      })
      .eq('member_id', memberId)

    if (error) {
      console.error('meal toggle update error:', error)
      toast.error(error.message)
      return
    }

    toast.success(
      `식단 관리가 ${enabled ? '활성화' : '비활성화'}되었습니다`
    )

    onRefresh?.()
  }

  return (
    <ToggleGroup
      type="single"
      value={mealEnabled ? 'on' : 'off'}
      onValueChange={handleToggle}
      className="mt-1"
    >
      <ToggleGroupItem value="on" className="flex gap-1">
        <Utensils size={14} />
        ON
      </ToggleGroupItem>
      <ToggleGroupItem value="off">
        OFF
      </ToggleGroupItem>
    </ToggleGroup>
  )
}