// components/ui/badge.tsx
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "destructive";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const base = "inline-block px-2 py-0.5 rounded-full text-xs font-semibold";
  const variants = {
    default: "bg-indigo-100 text-indigo-700",
    destructive: "bg-rose-100 text-rose-700",
  };

  return <span className={cn(base, variants[variant], className)}>{children}</span>;
}
