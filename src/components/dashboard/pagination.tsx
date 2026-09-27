import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  pageSize,
  total,
  buildHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  buildHref: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex items-center justify-between border-t border-ink-600/10 pt-4">
      <p className="text-xs text-ink-600">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex gap-2">
        <Link href={buildHref(Math.max(1, page - 1))} aria-disabled={page <= 1}>
          <Button variant="secondary" size="sm" disabled={page <= 1}>
            Previous
          </Button>
        </Link>
        <span className="flex items-center px-2 text-xs text-ink-600">
          Page {page} of {totalPages}
        </span>
        <Link href={buildHref(Math.min(totalPages, page + 1))} aria-disabled={page >= totalPages}>
          <Button variant="secondary" size="sm" disabled={page >= totalPages}>
            Next
          </Button>
        </Link>
      </div>
    </div>
  );
}
