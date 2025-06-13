import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type ButtonVariant = 'default' | 'outline' | 'destructive' | 'secondary' | 'primary' | 'ghost';
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
    default: 'text-white hover:bg-blue-700',
    outline: 'border border-gray-400 text-gray-700 hover:bg-gray-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    primary: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    ghost: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
  };

  const sizeStyles = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-3 text-lg',
  };

  return (
    <button
      {...props}
      className={twMerge(
        clsx(
          variantStyles[variant],
          sizeStyles[size],
          'rounded focus:outline-none transition duration-300',
          className
        )
      )}
    >
      {children}
    </button>
  );
}
