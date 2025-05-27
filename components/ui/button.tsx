// components/ui/button.tsx
import React from 'react'

import { clsx } from 'clsx'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode
    variant?: 'outline' | 'default'  // 원하는 variant 타입 추가
  }

export function Button({ children, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        'px-4 py-2 rounded focus:outline-none transition duration-300',
        className // 사용자가 직접 정의한 스타일이 가장 마지막에 오도록
      )}
    >
      {children}
    </button>
  )
}