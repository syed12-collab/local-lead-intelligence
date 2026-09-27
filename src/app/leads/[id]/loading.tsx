export default function LeadDetailLoading() {
  return (
    <div className="p-6">
      <div className="h-6 w-64 animate-pulse rounded bg-ink-600/10" />
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="h-32 animate-pulse rounded-md bg-ink-600/5" />
          <div className="h-32 animate-pulse rounded-md bg-ink-600/5" />
        </div>
        <div className="h-64 animate-pulse rounded-md bg-ink-600/5" />
      </div>
    </div>
  );
}
