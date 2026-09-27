import * as React from "react";
import { cn } from "@/lib/utils/cn";

const toneClasses: Record<string, string> = {
  neutral: "bg-ink-950/[.06] text-ink-800",
  signal: "bg-signal-soft text-signal",
  amber: "bg-amber-soft text-amber",
  rust: "bg-rust-soft text-rust",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof toneClasses }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
