'use client'

import { X } from 'lucide-react'

interface ParticipantsModalProps {
  participants: string[]
  onClose: () => void
  date: string
}

export default function ParticipantsModal({ participants, onClose, date }: ParticipantsModalProps) {
  // 알파벳 순으로 정렬된 배열
  const sortedParticipants = participants.slice().sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' })
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="relative bg-white w-full max-w-sm rounded-lg shadow-lg p-6">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
        >
          <X size={20} />
        </button>
        <h2 className="text-lg font-bold mb-4 text-indigo-700">{date} 참가자</h2>
        {sortedParticipants.length > 0 ? (
          <ul className="space-y-1 text-gray-700 text-sm max-h-[300px] overflow-auto">
            {sortedParticipants.map((name, idx) => (
              <li key={idx}>{name}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">참가자가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
