'use client'

import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'

interface TargetSelectListboxProps {
  targets: string[]
  value: string | null
  onChange: (target: string | null) => void
}

export default function TargetSelectListbox({ targets, value, onChange }: TargetSelectListboxProps) {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative w-[160px]">
        <Listbox.Button className="relative w-full cursor-pointer rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs sm:text-sm">
          <span className="block whitespace-normal break-words text-xs sm:text-sm"> 
            {value || 'Total'}
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
              key="total"
              value={null}
              className={({ active }) =>
                `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                  active ? 'bg-rose-100 text-rose-900' : 'text-gray-900'
                }`
              }
            >
              {({ selected }) => (
                <span className={`block truncate ${selected ? 'font-semibold' : ''}`}>Total</span>
              )}
            </Listbox.Option>

            {targets.map((target) => (
              <Listbox.Option
                key={target}
                value={target}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-rose-100 text-rose-900' : 'text-gray-900'
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block whitespace-normal break-words ${selected ? 'font-semibold' : ''}`}>
                      {target}
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
