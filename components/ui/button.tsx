import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type ButtonVariant =
  | 'default'
  | 'outline'
  | 'destructive'
  | 'secondary'
  | 'primary'
  | 'ghost'
  | 'click'
  | 'save'
  | 'menu_click'
  | 'menu_unclick';

type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  children,
  className,
  variant = 'default',
  size = 'md',
  ...props
}: ButtonProps) {
  const variantStyles = {
    menu_click: 'bg-white border border-gray-300 text-gray-800 font-semibold px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm',
    menu_unclick: 'bg-gray-100 border border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm',
    click: 'font-semibold bg-white border border-transparent text-gray-700 hover:bg-gray-300 px-3 py-2 rounded-full shadow-md flex items-center gap-1 text-sm',
    save: 'text-sm border border-gray-400 bg-gray-600 text-white hover:bg-gray-700',
    primary: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'text-sm border border-gray-400 text-gray-700 hover:bg-gray-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-3 text-lg',
  };

  return (
    <button
      {...props}
      className={twMerge(
        clsx(
          'rounded-md focus:outline-none transition duration-200',
          variantStyles[variant],
          sizeStyles[size],
          className
        )
      )}
    >
      {children}
    </button>
  );
}
