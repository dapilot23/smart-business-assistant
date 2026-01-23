export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col bg-[var(--background)] border border-[var(--border)] shadow-sm rounded-lg overflow-hidden"
        >
          <div className="p-5 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[var(--secondary)] animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[var(--secondary)] rounded animate-pulse w-20" />
              <div className="h-8 bg-[var(--secondary)] rounded animate-pulse w-24" />
            </div>
          </div>
          <div className="px-5 pb-4">
            <div className="h-6 bg-[var(--secondary)] rounded animate-pulse w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
