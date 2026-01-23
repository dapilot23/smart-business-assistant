export function ChartSkeleton() {
  return (
    <div className="bg-[var(--background)] border border-[var(--border)] shadow-sm rounded-lg p-6">
      <div className="h-6 bg-[var(--secondary)] rounded animate-pulse w-32 mb-6" />
      <div className="h-[300px] bg-[var(--secondary)] rounded animate-pulse" />
    </div>
  );
}
