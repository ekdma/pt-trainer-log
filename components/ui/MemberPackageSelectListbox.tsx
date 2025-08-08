'use client'

import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'

interface Member {
  id: number
  name: string
}

interface MemberPackageSelectListboxProps {
  members: Member[]
  value: number | null
  onChange: (memberId: number | null) => void
}

export default function MemberPackageSelectListbox({
  members,
  value,
  onChange,
}: MemberPackageSelectListboxProps) {
  // 선택된 member 객체 찾기 (value는 memberId)
  const selectedMember = members.find((m) => m.id === value) || null

  return (
    <Listbox value={selectedMember} onChange={(member) => onChange(member ? member.id : null)}>
      <div className="relative w-full max-w-md">
        <Listbox.Button className="relative w-full cursor-pointer rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs sm:text-sm">
          <span className="block truncate">
            {selectedMember ? selectedMember.name : '회원 선택'}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none text-xs sm:text-sm">
            <Listbox.Option
              key="none"
              value={null}
              className={({ active }) =>
                `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                  active ? 'bg-rose-100 text-rose-900' : 'text-gray-900'
                }`
              }
            >
              {({ selected }) => (
                <span className={`block truncate ${selected ? 'font-semibold' : ''}`}>
                  회원 선택
                </span>
              )}
            </Listbox.Option>

            {members
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
              .map((member) => (
                <Listbox.Option
                  key={member.id}
                  value={member}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-rose-100 text-rose-900' : 'text-gray-900'
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-semibold' : ''}`}>
                        {member.name}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-rose-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  )
}
