import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded border border-ink-600/20 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-600/50 focus:outline-none focus:ring-2 focus:ring-signal focus:border-transparent",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
