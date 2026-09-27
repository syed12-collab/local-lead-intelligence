import type { ReactNode } from "react";

export function Topbar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-ink-600/10 bg-white px-6">
      <div>
        <h1 className="text-base font-semibold text-ink-900">{title}</h1>
        {subtitle && <p className="text-xs text-ink-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
