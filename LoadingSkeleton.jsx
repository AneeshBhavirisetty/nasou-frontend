import { cx } from '../lib/format';

/* ─────────────────────────────────────────────────────────────
   LoadingSkeleton — shimmer placeholders.
   ───────────────────────────────────────────────────────────── */

function Shimmer({ className = '' }) {
  return (
    <div
      className={cx(
        'animate-pulse rounded bg-line',
        className
      )}
    />
  );
}

/* Product card skeleton */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <Shimmer className="aspect-[5/4] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Shimmer className="h-3 w-1/3" />
        <Shimmer className="h-4 w-2/3" />
        <Shimmer className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Shimmer className="h-4 w-1/4" />
          <Shimmer className="h-10 w-10 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/* Product grid skeleton — takes a count prop */
export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* Order card skeleton */
export function OrderCardSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-1/4" />
        <Shimmer className="h-6 w-20 rounded-full" />
      </div>
      <Shimmer className="h-3 w-1/3" />
      <Shimmer className="h-3 w-1/2" />
      <div className="pt-2 flex gap-2">
        <Shimmer className="h-9 w-24 rounded-md" />
        <Shimmer className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}

/* Table row skeleton */
export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Shimmer className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/* Generic line skeleton */
export function LineSkeleton({ lines = 3, className = '' }) {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3'];
  return (
    <div className={cx('space-y-2.5', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer key={i} className={cx('h-4', widths[i % widths.length])} />
      ))}
    </div>
  );
}

/* Profile form skeleton */
export function FormSkeleton({ fields = 4 }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Shimmer className="h-3 w-1/5" />
          <Shimmer className="h-11 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}
