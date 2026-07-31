function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[var(--color-surface-2)] ${className}`}
    />
  );
}

/** Instant feedback while dashboard pages load on the server. */
export default function DashboardLoading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-dashboard flex-col gap-8 px-8 py-12">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <Skeleton className="h-7 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-3 w-56 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Skeleton className="h-24 rounded-[1rem]" />
        <Skeleton className="h-24 rounded-[1rem]" />
        <Skeleton className="h-24 rounded-[1rem]" />
        <Skeleton className="h-24 rounded-[1rem]" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-28 w-full rounded-[1.25rem]" />
        <Skeleton className="h-28 w-full rounded-[1.25rem]" />
        <Skeleton className="h-28 w-full rounded-[1.25rem]" />
      </div>
    </main>
  );
}
