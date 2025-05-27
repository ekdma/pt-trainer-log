// app/members/page.tsx
'use client'

import { useState } from 'react'
import MemberSearch from './MemberSearch'
import MemberGraphs from './MemberGraphs'
import { WorkoutRecord, Member } from './types'

export default function MembersPage() {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutRecord[]>([])

  return (
    <main className="flex min-h-screen flex-col p-6 bg-gray-50 overflow-auto">
      <div className="p-4 w-full max-w-screen-2xl mx-auto">
        {selectedMember ? (
          <MemberGraphs
            member={selectedMember}
            record={workoutLogs.filter(log => log.member_id === selectedMember.member_id)}
            logs={workoutLogs.filter(log => log.member_id === selectedMember.member_id)}
            onBack={() => setSelectedMember(null)}
          />
        ) : (
          <MemberSearch
            onSelectMember={setSelectedMember}
            onSetLogs={setWorkoutLogs}
          />
        )}
      </div>
    </main>
  )
}
