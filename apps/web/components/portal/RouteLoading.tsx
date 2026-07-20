import { cn } from '@/lib/utils';

/** Skeleton de ruta (Server Component). Sin framer-motion ni fetches. */
function Bone({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-sm bg-brand-border/50', className)} aria-hidden />;
}

function CardsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-sm border border-brand-border bg-brand-surface p-6">
          <Bone className="h-4 w-1/3" />
          <Bone className="mt-3 h-5 w-3/4" />
          <Bone className="mt-2 h-3 w-full" />
          <Bone className="mt-2 h-3 w-5/6" />
          <Bone className="mt-4 h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-sm border border-brand-border bg-brand-surface p-6">
            <Bone className="h-3 w-1/2" />
            <Bone className="mt-3 h-9 w-1/3" />
          </div>
        ))}
      </div>
      <div className="rounded-sm border border-brand-border bg-brand-surface p-6">
        <Bone className="h-4 w-40" />
        <Bone className="mt-4 h-48 w-full" />
      </div>
    </div>
  );
}

function SplitSkeleton({ chatLike = false }: { chatLike?: boolean }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="max-h-[70vh] overflow-hidden rounded-sm border border-brand-border bg-brand-surface">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-b border-brand-border px-4 py-3">
            <Bone className="h-4 w-2/3" />
            <Bone className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="rounded-sm border border-brand-border bg-brand-surface p-6">
          <Bone className="h-5 w-1/3" />
          <Bone className="mt-2 h-3 w-1/2" />
          <Bone className="mt-4 h-3 w-full" />
          <Bone className="mt-2 h-3 w-5/6" />
        </div>
        <div
          className={cn(
            'rounded-sm border border-brand-border bg-brand-surface p-6',
            chatLike ? 'min-h-[320px]' : 'min-h-[200px]',
          )}
        >
          <Bone className="h-4 w-28" />
          <div className="mt-4 space-y-3">
            <Bone className="h-12 w-3/4" />
            <Bone className="ml-auto h-12 w-2/3" />
            <Bone className="h-12 w-3/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export type RouteLoadingVariant = 'cards' | 'metrics' | 'split' | 'chat';

export function RouteLoading({
  variant = 'cards',
  title,
}: {
  variant?: RouteLoadingVariant;
  title?: string;
}) {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Cargando página">
      <div>
        {title ? (
          <h1 className="font-display text-2xl font-bold">{title}</h1>
        ) : (
          <Bone className="h-8 w-56" />
        )}
        <Bone className="mt-2 h-3 w-72 max-w-full" />
      </div>
      {variant === 'metrics' && <MetricsSkeleton />}
      {variant === 'split' && <SplitSkeleton />}
      {variant === 'chat' && <SplitSkeleton chatLike />}
      {variant === 'cards' && <CardsSkeleton />}
    </div>
  );
}
