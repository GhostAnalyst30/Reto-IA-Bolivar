'use client';

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-brand-border/30"
      style={{ height }}
      aria-hidden
    />
  );
}
