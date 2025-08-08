import { cn } from "@/lib/utils";
import React from "react";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn("font-nanum text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
        {...props}
      >
        {children}
      </label>
    );
  }
);

Label.displayName = "Label";

export { Label };
