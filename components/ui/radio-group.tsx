// components/ui/radio-group.tsx
'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const radioGroupVariants = cva('grid gap-2', {
  variants: {
    direction: {
      vertical: 'grid-rows-[auto]',
      horizontal: 'grid-flow-col auto-cols-min',
    },
  },
  defaultVariants: {
    direction: 'vertical',
  },
})

export interface RadioGroupProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof radioGroupVariants> {
  options: { label: string; value: string }[]
  value: string
  onValueChange: (value: string) => void
}


export function RadioGroup({
  options,
  value,
  onValueChange,
  direction,
  className,
  ...props
}: RadioGroupProps) {
    return (
      <div className={cn(radioGroupVariants({ direction }), className, 'font-nanum')}>
        {options.map((option) => (
          <label
            key={option.value}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 bg-white border border-gray-300 hover:border-rose-400 cursor-pointer transition-colors whitespace-nowrap"
          >
            <input
              type="radio"
              name="radio-option"
              value={option.value}
              checked={value === option.value}
              onChange={() => onValueChange(option.value)}
              className="accent-rose-500 h-4 w-4"
              {...props}
            />
            <span className="text-xs font-medium text-gray-700">{option.label}</span>
          </label>
        ))}
      </div>
    )
  }
  

export default RadioGroup



export interface RadioGroupItemProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          ref={ref}
          className={cn('accent-primary h-4 w-4', className)}
          {...props}
        />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </label>
    )
  }
)

RadioGroupItem.displayName = 'RadioGroupItem'

export { RadioGroupItem }
